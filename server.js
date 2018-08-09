const express = require("express")
const app = express()

var quoteIndex = 0
var quotes = [{id:0, title:"title", quote:"quote", approved:true},
	      {id:1, title:"title1", quote:"quote1", approved:false}]

setInterval(() => {

    quoteIndex += 1
    if (quoteIndex >= quotes.length)
    {
	quoteIndex = 0
    }
    
},6000)

app.use(express.json())
app.use(express.static("images"))

app.get('/', (req, res) => {
    var quote = quotes[quoteIndex]
    res.end(quote.title + " " + quote.quote)
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
	html += quotes[i].title + "<br>"
	html += quotes[i].quote + "<br>"
	if (quotes[i].approved)
	{
    	    html += `<button onclick="unapprove(${i})">Unapprove</button>`
	}
	else
	{
	    html += `<button onclick="approve(${i})">Approve</button>`
	}

	html += `<button onclick="del(${i})">Delete</button>`
	html += "<br><br>"

    }
    
    html += "</html>"

    res.end(html)

})

app.get('/add', (req, res) => {

    var html ="<html>"
    
    html += "<button>Submit</button>"
    
    html += "</html>"

    res.end(html)
})

app.put('/quote', (req, res) => {
    //    var quote = {id:quotes.length, title:req.title, quote:req.quote, approved:false}
    var quote = {id:quotes.length, title:req.title, quote:req.quote, approved:req.approved}
    
    quotes.add(quote)
})

app.delete('/admin/quote/:id', (req, res) => {
    quotes.splice(req.params.id, 1)
})

app.get('/admin/quote/:id/approve', (req, res) => {
    quotes[req.params.id].approved = true
    console.log("approved id:" + req.params.id)
})

app.get('/admin/quote/:id/unapprove', (req, res) => {
    quotes[req.params.id].approved = false
    console.log("unapproved id:" + req.params.id)
})


app.listen(8080, () => console.log("app listening"))
