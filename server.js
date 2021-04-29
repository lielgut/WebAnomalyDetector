const express = require("express");
const bodyParser = require('body-parser')
const querystring = require('querystring')
const app = express();

app.get("/", function(request, response) {
    response.sendFile(__dirname + "/index.html");
});

app.post("/api/model", function (request, response) {
    let modelType = req.query.model_type;
});

app.get("/api/model", function (request, response) {
    
});

app.delete("/api/model", function (request, response) {
    
});

app.get("/api/models", function (request, response) {
    
});

app.post("/api/anomaly", function (request, response) {
    
});

app.listen(9876, function() {
    console.log("Server started on port 9876.")
})