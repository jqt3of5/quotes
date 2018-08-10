const express = require("express")
const multer = require("multer")
const mongo = require("mongodb")

const app = express()
const upload = multer({dest: "uploads/"})

var quoteIndex = 0
var selectedId = undefined

var images = [{value: "image2", name:"background2.jpg", textColor:"black"},
	      {value: "image3", name:"background3.jpg", textColor:"black"},
	      {value: "image4", name:"background4.jpg", textColor:"black"},
	      {value: "image5", name:"background5.jpg", textColor:"black"},
	      {value: "image6", name:"background6.jpg", textColor:"black"}]


var mongo_client = mongo.MongoClient
var db_url = "mongodb://localhost:27017/"
var db_name = "main"
function performDbActionOnCollection(collection, block)
{
    mongo_client.connect(db_url, function(err, client) {
	if (err){
	    console.log("Error connecting to the database..." + err)
	    return
	}

	var db = client.db(db_name)
	console.log("Database successfully connected")

	var collection = db.collection("slides")
	block(collection, function() {
	    client.close()   
	})
    })
}
 
getNextApprovedQuoteId()
setInterval(() => getNextApprovedQuoteId() ,60000)

function getNextApprovedQuoteId()
{
    performDbActionOnCollection("slides", function(collection) {
    
	collection.find({}).toArray(function(err, quotes) {
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

function createhtmlForImagePost(image)
{
    var file = image.filename

    return `<html>
<style>
body {                                                                                                                                                                                                                                                                                                                                                                     
background-size: cover                                                                                                                                                                                                                                                                                                                                                     
}   
html, body, {
    height: 100%;
}
</style>
<script>
setTimeout(() => location.reload(),60000)
</script>
<body background="/uploads/${file}">
</body>
</html>`
    
}

function createhtmlForTextPost(quote)
{
    var title = escapeHTML(quote.title)
    var author = escapeHTML(quote.author)
    
    if (quote.title == undefined || quote.title == "")
    {
	title = "Xactimate Mobile - Android"
    }
    
    var html= `<html>
<style>
body {
background-size: cover
}
html, body, {
    height: 100%;
}
.container {
    height:90%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    font-size: 55;
}
    
#title {
    font-size:40;
    margin-top:80px;
    margin-left:80px;
}
#quote {
    font-style:italic;
}
</style>
<script>
setTimeout(() => location.reload(),60000)
</script>`

    
    if (quote.image != -1)
    {
	var imagePath = images[quote.image].name
	html += `<body background="/${imagePath}">`
    }

    html += `<div id="title">${title}</div>
<div class="container">
<div>
<div id="quote">${quote.quote}</div>
<div style="text-align:right">${author}</div>
</div>
</div>
</body>
</html>`

    return html
}

function escapeHTML(s) { 
    return s.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}


app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(express.static("images"))
app.use("/uploads",express.static("uploads"))

app.get('/', (req, res) => {
    if (selectedId == undefined)
    {
	res.end(`<script>
		setTimeout(() => location.reload(),60000)
		</script>
		No quotes yet!`)
	return
    }
    
    performDbActionOnCollection("slides", function(collection, onComplete) {
	collection.findOne({id:selectedId}, function(err, item) {
	    if(err){
		console.log("failed to get quote with id: "+ selectedId+" " + err)
		res.end("there was an error")
		onComplete()
		return
	    }
	    
	    if (item == null)
	    {
		res.end(`<script>
		setTimeout(() => location.reload(),60000)
		</script>
		No quotes yet!`)
		onComplete()
		return
	    }

	    if (item.type == "image")
	    {
		var html = createhtmlForImagePost(item)   
		res.end(html)
	    }
	    if (item.type == "text")
	    {
		var html = createhtmlForTextPost(item)   
		res.end(html)
	    }
	    onComplete()
	})
    })
})

app.get('/admin', (req, res) => {
    
    var html = `
<html>
<head>
<script>
    function approve(id){
	var xhttp = new XMLHttpRequest()
	xhttp.open('GET', "/admin/quote/"+id+"/approve")
	xhttp.send()
    }
    function del(id){
	var xhttp = new XMLHttpRequest()
	xhttp.open('DELETE', "/admin/quote/"+ id)
	xhttp.send()
    }
    function unapprove(id) {
	var xhttp = new XMLHttpRequest()
	xhttp.open('GET', "/admin/quote/"+id+"/unapprove")
	xhttp.send()
    }
</script>
</head>`	

    performDbActionOnCollection("slides", function(collection, onComplete) {
	collection.find({}).toArray(function(err, quotes) {
            if (err) {
		console.log("Error fetching items from slides collection")
		onComplete()
		return
            }
	    
	    for (var i = 0; i < quotes.length; ++i)
	    {
		var item = quotes[i]

		if (item.type == "text")
		{
		    html += escapeHTML(item.title) + "<br>"
		    html += escapeHTML(item.quote) + "<br>"
		}
		if (item.type == "image")
		{
		    html += `<img width=100 height=100 src="uploads/${item.filename}"></img><br>`
		}
		
		if (item.approved)
		{
    		    html += `<button onclick="unapprove(${item.id})">Unapprove</button>`
		}
		else
		{
		    html += `<button onclick="approve(${item.id})">Approve</button>`
		}
		
		html += `<button onclick="del(${item.id})">Delete</button>`
		html += `<a href="/quote/${item.id}">Preview</a>`
		html += "<br><br>"
	    }
    
	    html += "</html>"
	    res.end(html)
	    onComplete()
	})
    })
})

app.get('/image', (req, res) => {
    var html ="<html>"
    html += "<form action=\"/image\" enctype=\"multipart/form-data\" method=\"post\">"
//    html += "Title: <input type=\"text\" placeholder=\"Title\" name=\"title\"></input><br>"
    html += `Image: <input type="file" name="image" accept="image/*"><br>`
//    html += "Subtitle: <input type=\"text\" placeholder=\"Subtitle\" name=\"subtitle\"></input><br><br>"
    html += "<button type=\"submit\" value=\"Submit\">Submit</button>"
    html += "</form>"
    html += "</html>"
    res.end(html)
})

app.post('/image', upload.single('image'), (req, res) => {
    console.log("got file: " + req.file.filename)
    
//    var title = req.body.title
//    var subtitle = req.body.subtitle
    var filename = req.file.filename
    
    performDbActionOnCollection("slides", function(collection, onComplete) {
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

    var html ="<html>"
    html += "<form action=\"/quote\" method=\"post\">"
    html += "Title: <input type=\"text\" placeholder=\"Title\" name=\"title\"></input><br>"
    html += "Quote: <textarea placeholder=\"Quote\" name=\"quote\"></textarea><br>"
    html += "Author: <input type=\"text\" placeholder=\"Author\" name=\"author\"></input><br><br>"
    html+= "Background Image: <br>"

    html += `<input type="radio" name="image" value="-1" checked>None<br>`
    
    for (var i = 0; i < images.length; ++i)
    {
	html += `<input type="radio" name="image" value=${i}><img height=100 width=100 src="${images[i].name}" /><br>`
    }
    html += "<br>"
    html += "<button type=\"submit\" value=\"Submit\">Submit</button>"
    //html += `<a href="/quotes/${}">Preview</a>`
    html += "</form>"
    
    html += "</html>"

    res.end(html)
})

//add quote
app.post('/quote', (req, res) => {
    var quote = req.body

    console.log("got: " + JSON.stringify(quote))

    performDbActionOnCollection("slides", function(collection, onComplete) {
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


//Preview
app.get('/quote/:id', (req, res) => {
    performDbActionOnCollection("slides", function(collection, onComplete) {
	collection.findOne({id:parseInt(req.params.id)}, function(err, item) {
	    if(err || item == null){
		console.log("failed to get quote to preview with id: "+ req.params.id +" " + err)
		res.end("invalid id")
		onComplete()
		return
	    }

	    if (item.type == "image")
	    {
		var html = createhtmlForImagePost(item)   
		res.end(html)
	    }
	    if (item.type == "text")
	    {
		var html = createhtmlForTextPost(item)   
		res.end(html)
	    }

	    onComplete()
	})
    })
})



//delete quote
app.delete('/admin/quote/:id', (req, res) => {

    performDbActionOnCollection("slides", function(collection, onComplete) {
	collection.deleteOne({id: parseInt(req.params.id)}, function(err, result) {
	    if(err){
		res.end("invalid id")
		console.log("error deleting quote from collection " + err)
		onComplete()
		return
	    }
	    res.end("OK")
	    onComplete()
	})
    })
})

app.get('/admin/quote/:id/approve', (req, res) => {

    performDbActionOnCollection("slides", function(collection, onComplete) {
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

    performDbActionOnCollection("slides", function(collection, onComplete) {
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


app.listen(8080, () => console.log("app listening"))
