const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({
    extended: true
  }));
const bodyParser = require('body-parser')
const querystring = require('querystring')
const anomDet = require('./algorithm/AnomalyDetector.js');
const ts = require('./algorithm/TimeSeries.js');
const TimeSeries = ts.TimeSeries;
const SimpleAnomalyDetector = anomDet.SimpleAnomalyDetector;
const HybridAnomalyDetector = anomDet.HybridAnomalyDetector;
const fs = require('fs');

// load models and data from files
var models = [];
var detectors = [];
fs.readdirSync('./models/').forEach(file => {
    let split = file.split('.');
    if(split[split.length - 1] == 'json') {
        let model = JSON.parse(fs.readFileSync('./models/' + file, 'utf8'));
        models[model.model_id] = model;
        let detData = JSON.parse(fs.readFileSync('./detectors/' + file, 'utf8'));
        let det;
        if(detData.type == 'regression') {
            det = new SimpleAnomalyDetector();
        } else if(detData.type == 'hybrid') {
            det = new HybridAnomalyDetector();
        }
        det.cf = detData.cf;
        det.threshold = detData.threshold;
        detectors[model.model_id] = det;
    }
  });

app.get("/", function(request, response) {
    response.sendFile(__dirname + "/index.html");
});

app.get("/style.css", function(request, response) {
    response.sendFile(__dirname + "/style.css");
});

app.get("/index.js", function(request, response) {
    response.sendFile(__dirname + "/index.js");
});

app.post("/api/model", function (request, response) {

    let data = request.body.train_data;
    let id = models.length;
    let currTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString();
    let model = { model_id: models.length, upload_time: currTime, status: 'pending' };
    response.send(JSON.stringify(model));
    models.push(model);


    let t = new TimeSeries(data);

    let modelType = request.query.model_type;
    
    let det;
    if(modelType == 'regression') {
        det = new SimpleAnomalyDetector();
    } else if(modelType == 'hybrid') {
        det = new HybridAnomalyDetector();
    } else {
        // TODO error
    }
    det.learnNormal(t);
    model.status = 'ready';
    // TODO send when learning finished

    let detData = {cf: det.cf, threshold: det.threshold, type: modelType};
    fs.writeFileSync('./detectors/' + id + '.json', JSON.stringify(detData), err => {
        if(err) {
            // TODO something
        }
        console.log("saved detector file");
    })

    fs.writeFileSync('./models/' + id + '.json', JSON.stringify(model), err => {
        if(err) {
            // TODO something
        }
        console.log("saved model file");
    });

});

app.get("/api/model", function (request, response) {
    let model_id = request.query.model_id;
    let model = models[model_id];
    if(model != undefined) {
        response.send(JSON.stringify(model));
    } else {
        response.status(406).send('found no model with given id'); 
    }
});

app.delete("/api/model", function (request, response) {
    let model_id = request.query.model_id;
    if(models[model_id] != undefined) {
        models[model_id] = undefined;
        detectors[model_id] = undefined;
        response.send();
        fs.unlinkSync('./models/' + model_id + '.json');
        fs.unlinkSync('./detectors/' + model_id + '.json');
    } else {
        response.status(406).send('found no model with given id'); 
    }
});

app.get("/api/models", function (request, response) {
    let m = [];
    for(let i=0; i<models.length; i++) {
        if(models[i] != undefined) {
            m.push(models[i]);
        }
    }
    response.send(JSON.stringify(m));
});

app.post("/api/anomaly", function (request, response) {
    let model_id = request.query.model_id;
    let det = detectors[model_id];
    if(det == undefined) {
        response.status(406).send('found no model with given id'); 
    }
    else {
        if(models[model_id].status == 'ready') {
            let data = request.body.predict_data;
            let t = new TimeSeries(data);
            response.send(JSON.stringify({anomalies: det.detect(t)}));
        }
        else {
            response.redirect(303, '/api/model?model_id=' + model_id);
        }
    }
});

app.listen(9876, function() {
    console.log("Server started on port 9876.")
})