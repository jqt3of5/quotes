const fs = require('fs');
const readline = require('readline');
const mongo = require("mongodb")

const config = require('./config')

const {google} = require('googleapis')
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err)

    authorize(JSON.parse(content), listMajors)
});


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '14i701s9ihzv2CxKUMdzFsBusqMDaZwzNDayzjWSxvoQ',
    range: 'A2:E',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Name, Major:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[3]}`);
      });
	insertSpreadsheets()
    } else {
      console.log('No data found.');
    }
  });
}

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
function insertSpreadsheets() {
connectAndPerform(function() {

    var overall = {
        approved:true,
        remoteIp: "",
        type:"leaderboard", 
        spreadsheetId:"14i701s9ihzv2CxKUMdzFsBusqMDaZwzNDayzjWSxvoQ",
        range:"All Leaderboard - All Time!A2:B", 
        title:"Learning Initiative Top 10 Leaderboard, Department Overall", 
        color:"red"}

    var dev = {
        approved:true,
        remoteIp: "",
        type:"leaderboard", 
        spreadsheetId:"14i701s9ihzv2CxKUMdzFsBusqMDaZwzNDayzjWSxvoQ",
        range:"Dev / Automation Leaderboard - All Time!A2:B", 
        title:"Learning Initiative Top 10 Leaderboard, Development", 
        color:"green"}

    var qa = {
        approved:true,
        remoteIp: "",
        type:"leaderboard", 
        spreadsheetId:"14i701s9ihzv2CxKUMdzFsBusqMDaZwzNDayzjWSxvoQ",
        range:"QA Leaderboard - All Time!A2:B", 
        title:"Learning Initiative Top 10 Leaderboard, QA", 
        color:"blue"}

    var pm = {
        approved:true,
        remoteIp: "",
        type:"leaderboard", 
        spreadsheetId:"14i701s9ihzv2CxKUMdzFsBusqMDaZwzNDayzjWSxvoQ",
        range:"PM / UX / Doc Leaderboard - All Time!A2:B", 
        title:"Learning Initiative Top 10 Leaderboard, Product", 
        color:"brown"}

    

    performDbActionOnCollection(collection_name, function(collection) {
        
        collection.insertMany([overall, dev, qa, pm], function(err, result) {
            if(err){
                console.log("error inserting new quote into collection " + err)
            }
        })
    })
})

}
