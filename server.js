const express = require("express")
const app = express()

var quoteIndex = 0
//{id:0, title:"", quote:"", approved:"", submitted:""}
var quotes = []

var images = [{value: "image2", name:"background2.jpg", textColor:"black"},
	      {value: "image3", name:"background3.jpg", textColor:"black"}]

function createhtmlForQuote(quote)
{
    var quote = quotes[quoteIndex]
    var imagePath = images[quote.image].name
    var title = escapeHTML(quote.title)
    var author = escapeHTML(quote.author)
    
    if (quote.title == undefined || quote.title == "")
    {
	title = "Xactimate Mobile - Android"
    }
    
       return `<html>
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
</style>
<script>
setTimeout(() => location.reload(),60000)
</script>
<body background="${imagePath}">
<div><h1>${title}</h1></div>
<div class="container">
<div>
<div>${quote.quote}</div>
<div style="text-align:right">${author}</div>
</div>
</div>
</body>

</html>`
 
}

function escapeHTML(s) { 
    return s.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

setInterval(() => {

    quoteIndex += 1
    if (quoteIndex >= quotes.length)
    {
	quoteIndex = 0
    }
    
},6000)

app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(express.static("images"))

app.get('/', (req, res) => {

    if (quotes.length == 0)
    {
	res.end("No quotes yet!")
	return
    }

    if (quoteIndex > quotes.length)
    {
	res.end("An error occured, please refresh")
	return
    }
    
    var html = createhtmlForQuote(quotes[quoteIndex])
    
    res.end(html)
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

    for (var i = 0; i < quotes.length; ++i)
    {
	html += escapeHTML(quotes[i].title) + "<br>"
	html += escapeHTML(quotes[i].quote) + "<br>"
	if (quotes[i].approved)
	{
    	    html += `<button onclick="unapprove(${i})">Unapprove</button>`
	}
	else
	{
	    html += `<button onclick="approve(${i})">Approve</button>`
	}

	html += `<button onclick="del(${i})">Delete</button>`
	html += `<a href="/quotes/${i}">Preview</a>`
	html += "<br><br>"
    }
    
    html += "</html>"

    res.end(html)

})

app.get('/add', (req, res) => {

    var html ="<html>"

    html += "<form action=\"/quote\" method=\"post\">"
    html += "Title: <input type=\"text\" placeholder=\"Title\" name=\"title\"></input><br>"
    html += "Quote: <textarea placeholder=\"Quote\" name=\"quote\"></textarea><br>"
    html += "Author: <input type=\"text\" placeholder=\"Author\" name=\"author\"></input><br><br>"
    html+= "Background Image: <br>"
    for (var i = 0; i < images.length; ++i)
    {
	html += `<input type="radio" name="image" value=${i} `
	if (i == 0)
	{
	    html += "checked"
	}
	html += "><img height=100 width=100 src=\""+images[i].name+"\" /><br>"
    }
    html += "<br>"
    html += "<button type=\"submit\" value=\"Submit\">Submit</button>"
    html += "</form>"
    
    html += "</html>"

    res.end(html)
})


//Preview
app.get('/quote/:id', (req, res) => {
    if (req.params.id >= quotes.length)
    {
	res.end("invalid id")
	return
    }
    var html = createhtmlForQuote(quotes[req.params.id])
    res.end(html)
})

//add quote
app.post('/quote', (req, res) => {
    var quote = req.body
    //quote.approved = false
    console.log("got: " + JSON.stringify(quote))
    quote.id = quotes.length
    quotes.push(quote)
    res.end("Thank you! Your submission will be reviewed")
})

//delete quote
app.delete('/admin/quote/:id', (req, res) => {

    if (req.params.id >= quotes.length)
    {
	res.end("invalid id")
	return
    }

    quotes.splice(req.params.id, 1)
    if (quoteIndex > req.params.id)
    {
	quoteIndex -= 1
    }
})

app.get('/admin/quote/:id/approve', (req, res) => {
    if (req.params.id >= quotes.length)
    {
	res.end("invalid id")
	return
    }

    quotes[req.params.id].approved = true
    console.log("approved id:" + req.params.id)
})

app.get('/admin/quote/:id/unapprove', (req, res) => {

    if (req.params.id >= quotes.length)
    {
	res.end("invalid id")
	return
    }

    quotes[req.params.id].approved = false
    console.log("unapproved id:" + req.params.id)
})


app.listen(8080, () => console.log("app listening"))
