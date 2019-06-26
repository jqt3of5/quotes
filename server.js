const express = require("express")
const multer = require("multer")
const mongo = require("mongodb")
const auth = require("express-basic-auth")
const ip = require('ip')
const process = require('process')
const path = require('path')
const app = express()

const fs = require('fs');
const readline = require('readline');

const {google} = require('googleapis')
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';


function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
	client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
	if (err) return console.log("authentication failed: " + err)
	oAuth2Client.setCredentials(JSON.parse(token));
	callback(oAuth2Client);
    });
}

//We must change the working directory to be __dirname so that when we auto start the server, we can change the working dir to be the correct one so it will find all of the
//accompanying files. 
process.chdir(__dirname)

const config = require('./config')
const upload = multer({dest: config.uploads_path})


var quoteIndex = 0
var selectedId = undefined


//Text color is unused. But it would be a good idea to implement the feature if we ever start using dark colored backgrounds
var images = [{value: "image2", name:"background2.jpg", textColor:"black"},
	      {value: "image3", name:"background3.jpg", textColor:"black"},
	      {value: "image4", name:"background4.jpg", textColor:"black"},
	      {value: "image5", name:"background5.jpg", textColor:"black"},
	      {value: "image6", name:"background6.jpg", textColor:"black"},
	      {value: "image6", name:"background6.jpg", textColor:"black"}]

var mongo_client = mongo.MongoClient
var db_url = `mongodb://${config.db_host}:${config.db_port}/`
const collection_name = "slides"


var db_connection;
function performDbActionOnCollection(collection_name, block)
{
    if (db_connection != undefined)
    {
	try {
	    var db = db_connection.db(config.db_name)
	    var collection = db.collection(collection_name)
	    block(collection)
	}
	catch(err)
	{
	    console.log("caught exception: " + err)
	    block(null)
	}
    }
}

function connectAndPerform(block){
    mongo_client.connect(db_url, function(err, client) {
	if (err){
	    console.log("Error connecting to the database..." + err)
	    return
	}
	console.log("Connected to database")
	db_connection = client
	block()
    })
}
app.listen(config.port, () => console.log("app listening"))
connectAndPerform(function() {
    getNextApprovedQuoteId()
    app.listen(config.port, () => console.log("app listening"))
})

setInterval(() => getNextApprovedQuoteId(), config.slide_timeout * 1000)

function getNextApprovedQuoteId()
{
    performDbActionOnCollection(collection_name, function(collection) {
    
	collection.find({approved:true}).toArray(function(err, quotes) {
	    if (err) {
			console.log("Error fetching items from slides collection")
			return
	    }
	    
	    var quote = getNextApprovedQuote(quotes)
	    if (quote != undefined)
	    {
			selectedId = quote._id
	    }
	    else
	    {
			selectedId = undefined
	    }
	})    
    })
}

function getNextApprovedQuote(quotes)
{
    for (var i = 0; i < quotes.length; ++i)
    {
	quoteIndex += 1
     
	if (quoteIndex >= quotes.length)
	{
	    quoteIndex = 0
	}

	if (quotes[quoteIndex].approved)
	{
	    return quotes[quoteIndex]
	}	
    }
    return undefined
}

app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use("/images", express.static("images"))
app.use("/uploads",express.static("uploads"))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'));


app.get('/', (req, res) => res.render("index", {server_address: config.show_address ? `${ip.address()}:${config.port}` : ""}))
app.get('/addImage', (req, res) => {res.sendFile("newImage.html", {root: __dirname}) })
app.get('/addQuote', (req, res) => {

    var html ="<html>"
    html += "<form action=\"/quote\" method=\"post\">"
    html += "Title: <input type=\"text\" placeholder=\"Title\" name=\"title\"></input><br>"
    html += "Quote: <textarea placeholder=\"Quote\" name=\"quote\"></textarea><br>"
    html += "Author: <input type=\"text\" placeholder=\"Author\" name=\"author\"></input><br><br>"
    html+= "Background Image: <br>"

    html += `<input type="radio" name="image" value="-1" checked>None<br>`
    
    for (var i = 0; i < images.length; ++i)
    {
		html += `<input type="radio" name="image" value="${images[i].name}"><img height=100 width=100 src="/images/${images[i].name}" /><br>`
    }
    html += "<br>"
    html += "<button type=\"submit\" value=\"Submit\">Submit</button>"
    html += "</form>"
    
    html += "</html>"

    res.end(html)
})

//Preview
app.get('/quote/:id', (req, res) => {
    performDbActionOnCollection(collection_name, function(collection) {

	collection.findOne({_id:new mongo.ObjectID(req.params.id)}, function(err, item) {
			if(err || item == null){
				console.log("failed to get quote to preview with id: " + req.params.id + " " + err)
				res.end("invalid id")
				return
			}
	    res.render("preview", {item: item}) 
	})
    })
})



app.get('/quote', (req, res) => {
    if (selectedId == undefined)
    {
	res.end(`{success:false, error:"No Quote Selected"}`)
	return
    }

    //TODO: Google api for accessing the sheets
/*    fs.readFile('credentials.json', (err, content) => {
	if (err) return console.log('Error loading client secret file:', err)
	
	authorize(JSON.parse(content), function (auth) {
	    const sheets = google.sheets({version: 'v4', auth});
	    sheets.spreadsheets.values.get({
		spreadsheetId: '14i701s9ihzv2CxKUMdzFsBusqMDaZwzNDayzjWSxvoQ',
		range: 'A2:E',
	    }, (err, response) => {
		if (err) return console.log('The API returned an error: ' + err);
		const rows = response.data.values;
		if (rows.length) {

		    var scores = rows.filter((row) => row[4] != undefined);
		    item = {type:'html', html:JSON.stringify(scores)}
		    res.end(JSON.stringify(item))			
		} else {
		    console.log('No data found.');
		}
	    });
	})
    });

    return;
  */  
    performDbActionOnCollection(collection_name, function(collection) {

	collection.findOne({_id:selectedId}, function(err, item) {
	    if(err){
		console.log("failed to get quote with id: "+ selectedId +" " + err)
		res.end(`{success:false, error:"Could not Access Database"}`)
		return
	    }
	    
	    if (item == null)
	    {
		res.end(`{success:false, error:"Item not found"}`)
		return
	    }

	   res.end(JSON.stringify(item))
	})
    })
})

app.post('/image', upload.single('image'), (req, res) => {
    console.log("got file: " + req.file.filename)
    
    var filename = req.file.filename
    
    performDbActionOnCollection(collection_name, function(collection) {
	    var image = {type:"image", approved:false, filename:filename}
	    collection.insertOne(image, function(err, result) {
		if(err){
		    console.log("error inserting new quote into collection " + err)
		    res.end("There was an error")
		    return
		}
		res.end("Thank you! Your submission will be reviewed")
	    })
    })
})

//add quote
app.post('/quote', (req, res) => {
    var quote = req.body

    console.log("got: " + JSON.stringify(quote))

    performDbActionOnCollection(collection_name, function(collection) {

	quote.approved = false
	quote.type = "text"
	quote.remoteIp = req.connection.remoteAddress
	collection.insertOne(quote, function(err, result) {
	    if(err){
		console.log("error inserting new quote into collection " + err)
		res.end("There was an error")
		return
	    }
	    res.end("Thank you! Your submission will be reviewed")
	})
    })
})

app.get('/quotes', (req, res) => {
	performDbActionOnCollection(collection_name, function(collection) {
		collection.find({}).toArray(function(err, items) {
			if (err)
			{
				res.end({success:false, error:err})
				return
			}

		  
			res.end(JSON.stringify(items))
		})
	})
})


app.use(auth({
    users:config.admin_users,
    challenge: true
}))

app.get('/admin', (req, res) => {res.sendFile("admin.html", {root: __dirname}) })
//delete quote
app.delete('/admin/quote/:id', (req, res) => {

    performDbActionOnCollection(collection_name, function(collection) {

	collection.deleteOne({_id: new mongo.ObjectID(req.params.id)}, function(err, result) {
	    if(err){
			res.end("invalid id")
			console.log("error deleting quote from collection " + err)
			return
	    }

    	    if (selectedId == req.params.id)
	    {
		getNextApprovedQuoteId()
	    }

	    res.end("OK")
	})
    })
})

app.get('/admin/quote/:id/approve', (req, res) => {

    performDbActionOnCollection(collection_name, function(collection) {
	collection.updateOne({_id: new mongo.ObjectID(req.params.id)},{ $set: {approved: true}},  function(err, result) {
	    if(err){
			console.log("error approving quote from collection " + err)
			res.end("invalid id")
			return
	    }

	    //Immediately show when we approve a quote and it's the first one
	    if (selectedId == undefined)
	    {
		selectedId = req.params.id
	    }
	    
	    console.log("approved id:" + req.params.id)
	    res.end("OK")
	})
    })
})

app.get('/admin/quote/:id/unapprove', (req, res) => {

    performDbActionOnCollection(collection_name, function(collection) {
	collection.updateOne({_id: new mongo.ObjectID(req.params.id)},{ $set: {approved: false}},  function(err, result) {
	    if(err){
		console.log("error unapproving quote from collection " + err)
		res.end("invalid id")
		return
	    }

	    if (selectedId == req.params.id)
	    {
		getNextApprovedQuoteId()
	    }
	    
	    console.log("unapproved id:" + req.params.id)
	    res.end("OK")
	})
    })
})

