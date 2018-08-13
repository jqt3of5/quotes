const express = require("express")
const multer = require("multer")
const mongo = require("mongodb")
const auth = require("express-basic-auth")

const app = express()
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

function performDbActionOnCollection(collection, block)
{
    mongo_client.connect(db_url, function(err, client) {
	if (err){
	    console.log("Error connecting to the database..." + err)
	    return
	}

	var db = client.db(config.db_name)
	console.log("Database successfully connected")

	var collection = db.collection(collection_name)
	block(collection, function() {
	    client.close()   
	})
    })
}
 
getNextApprovedQuoteId()
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
			selectedId = quote.id
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

function escapeHTML(s) { 
    return s.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}


app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use("/images", express.static("images"))
app.use("/uploads",express.static("uploads"))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {res.sendFile("index.html", {root: __dirname}) })
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
    performDbActionOnCollection(collection_name, function(collection, onComplete) {
	collection.findOne({id:parseInt(req.params.id)}, function(err, item) {
			if(err || item == null){
				console.log("failed to get quote to preview with id: " + req.params.id + " " + err)
				res.end("invalid id")
				onComplete()
				return
			}
			//TODO
	    res.render("preview", {item: item}) 
			onComplete()
		})
	})
})


app.post('/image', upload.single('image'), (req, res) => {
    console.log("got file: " + req.file.filename)
    
//    var title = req.body.title
//    var subtitle = req.body.subtitle
    var filename = req.file.filename
    
    performDbActionOnCollection(collection_name, function(collection, onComplete) {
	collection.countDocuments({}, function(err, result) {
	    if (err) {
		console.log("Error counting slides" + err)
		res.end("There was an error")
		onComplete()
		return
	    }

	    //Not the best id system ever, but it works for now :)
	    var image = {id:result, type:"image", approved:false, filename:filename}
	    collection.insertOne(image, function(err, result) {
		if(err){
		    console.log("error inserting new quote into collection " + err)
		    res.end("There was an error")
		    onComplete()
		    return
		}
		res.end("Thank you! Your submission will be reviewed")
		onComplete()
	    })
	})
    })
    
})

app.get('/quote', (req, res) => {
	if (selectedId == undefined)
    {
		res.end(`{success:false, error:"No Quote Selected"}`)
		return
    }
    
    performDbActionOnCollection(collection_name, function(collection, onComplete) {
		collection.findOne({id:selectedId}, function(err, item) {
			if(err){
				console.log("failed to get quote with id: "+ selectedId +" " + err)
				res.end(`{success:false, error:"Could not Access Database"}`)
				onComplete()
				return
			}
			
			if (item == null)
			{
				res.end(`{success:false, error:"Item not found"}`)
				onComplete()
				return
			}

			res.end(JSON.stringify(item))
			onComplete()
		})
    })
})

//add quote
app.post('/quote', (req, res) => {
    var quote = req.body

    console.log("got: " + JSON.stringify(quote))

    performDbActionOnCollection(collection_name, function(collection, onComplete) {
		collection.countDocuments({}, function(err, result) {
			if (err) {
				console.log("Error counting slides" + err)
				res.end("There was an error")
				onComplete()
				return
			}

			//Not the best id system ever, but it works for now :)
			quote.id = result
			quote.approved = false
		        quote.type = "text"
		        quote.title = escapeHTML(quote.title)
		        quote.author = escapeHTML(quote.author)
		        quote.remoteIp = req.connection.remoteAddress
			collection.insertOne(quote, function(err, result) {
			if(err){
				console.log("error inserting new quote into collection " + err)
				res.end("There was an error")
				onComplete()
				return
			}
			res.end("Thank you! Your submission will be reviewed")
			onComplete()
			})
		})
    })
})

app.get('/quotes', (req, res) => {
	performDbActionOnCollection(collection_name, function(collection, onComplete) {
		collection.find({}).toArray(function(err, items) {
			if (err)
			{
				res.end({success:false, error:err})
				onComplete()
				return
			}
			res.end(JSON.stringify(items))
			onComplete()
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

    performDbActionOnCollection(collection_name, function(collection, onComplete) {
	collection.deleteOne({id: parseInt(req.params.id)}, function(err, result) {
	    if(err){
			res.end("invalid id")
			console.log("error deleting quote from collection " + err)
			onComplete()
			return
	    }

    	    if (selectedId == req.params.id)
	    {
		getNextApprovedQuoteId()
	    }

	    res.end("OK")
	    onComplete()
	})
    })
})

app.get('/admin/quote/:id/approve', (req, res) => {

    performDbActionOnCollection(collection_name, function(collection, onComplete) {
	collection.updateOne({id: parseInt(req.params.id)},{ $set: {approved: true}},  function(err, result) {
	    if(err){
			console.log("error approving quote from collection " + err)
			res.end("invalid id")
			onComplete()
			return
	    }

	    //Immediately show when we approve a quote and it's the first one
	    if (selectedId == undefined)
	    {
			selectedId = parseInt(req.params.id)
	    }
	    
	    console.log("approved id:" + req.params.id)
	    res.end("OK")
	   
	    onComplete()
	})
    })
})

app.get('/admin/quote/:id/unapprove', (req, res) => {

    performDbActionOnCollection(collection_name, function(collection, onComplete) {
	collection.updateOne({id: parseInt(req.params.id)},{ $set: {approved: false}},  function(err, result) {
	    if(err){
		console.log("error unapproving quote from collection " + err)
		res.end("invalid id")
		onComplete()
		return
	    }

	    if (selectedId == req.params.id)
	    {
		getNextApprovedQuoteId()
	    }
	    
	    console.log("unapproved id:" + req.params.id)
	    res.end("OK")
	    onComplete()
	})
    })
})
app.listen(config.port, () => console.log("app listening"))
