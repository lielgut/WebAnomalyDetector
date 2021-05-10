const express = require("express");
const app = express();
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({
    extended: true,
    limit: '50mb'
  }));
const bodyParser = require('body-parser')
const querystring = require('querystring')
const anomDet = require('./algorithm/AnomalyDetector.js');
const ts = require('./algorithm/TimeSeries.js');
const TimeSeries = ts.TimeSeries;
const SimpleAnomalyDetector = anomDet.SimpleAnomalyDetector;
const HybridAnomalyDetector = anomDet.HybridAnomalyDetector;
const fs = require('fs');
const moment = require("moment");
const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/modelsDB", {useNewUrlParser: true, useUnifiedTopology: true});

const modelSchema = new mongoose.Schema ({
    model_id: Number,
    upload_time: String,
    status: String
});
const Model = mongoose.model("Model", modelSchema);

const detectorSchema = new mongoose.Schema ({
    model_id: Number,
    cf: [{
            feature1: String,
            feature2: String,
            correlation: Number,
            lin_reg: {a: Number, b: Number},
            threshold: Number,
            cx: Number,
            cy: Number
        }],
    threshold: Number,
    type: String
});
const Detector = mongoose.model("Detector", detectorSchema);

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

    Model.countDocuments({}, (err, count) => {
        if(err) {
            console.log("error in countDocuments");
        }
        else {
            let data = request.body.train_data;
            let currTime = moment().format();
            let id = count + 1;
            let model = { model_id: id, upload_time: currTime, status: 'pending' };
            response.send(JSON.stringify(model));
            const modelEntry = new Model(model);
            modelEntry.save().then(() => {
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
                Model.updateOne({ model_id: id }, { $set: {status: 'ready'}}).then(() => {
                    let detData = {model_id: id, cf: det.cf, threshold: det.threshold, type: modelType};
                    let detector = new Detector(detData);
                    detector.save();
                });

            });
        }
    });
});

app.get("/api/model", function (request, response) {
    let id = request.query.model_id;
    Model.findOne({model_id: id}, {_id: 0, model_id: 1, upload_time: 1, status: 1}, (err, model) => {
        if(err) {
            console.log("error deleting model " + id);
        } else {
            if(model != null) {
                response.send(JSON.stringify(model));
            } else {
                response.status(406).send('found no model with given id'); 
            }
        }
    });
});

app.delete("/api/model", function (request, response) {
    let id = request.query.model_id;
    Model.deleteOne({model_id: id}, (err, result) => {
        if(err) {
            // ...
        } else {
            if(result.deletedCount != 0) {
                response.send();
                Detector.deleteOne({model_id: id}, (err) => {
                    if(err) {
                        console.log("error deleting detector " + id);           
                    }
                });
            } else {
                response.status(406).send('found no model with given id'); 
            }
        }
    });
});

app.get("/api/models", function (request, response) {
    Model.find({}, {_id: 0, model_id: 1, upload_time: 1, status: 1}, (err, models) => {
        if(err) {
            console.log("error getting models");
        } else {
            response.send(JSON.stringify(models));
        }
    });
});

app.post("/api/anomaly", function (request, response) {
    let id = request.query.model_id;
    
    Detector.findOne({model_id: id}, (err, detInfo) => {
        if(err) {
            console.log("error getting detector " + id);
        } else {
            if(detInfo != null) {
                Model.findOne({model_id: id}, (err, model) => {
                    if(err) {
                        console.log("error getting model " + id);
                    } else {
                        if(model.status == 'ready') {
                            let data = request.body.predict_data;
                            let t = new TimeSeries(data);
                            let det;
                            if(detInfo.type == 'regression') {
                                det = new SimpleAnomalyDetector();
                            } else if(detInfo.type == 'hybrid') {
                                det = new HybridAnomalyDetector();
                            }
                            det.cf = detInfo.cf;
                            det.threshold = detInfo.threshold;
                            response.send(JSON.stringify(det.detect(t)));
                        }
                        else {
                            response.redirect(303, '/api/model?model_id=' + id);
                        }
                    }
                });
            } else {
                response.status(406).send('found no model with given id'); 
            }
        }
    });
});

app.listen(9876, function() {
    console.log("Server started on port 9876.")
})