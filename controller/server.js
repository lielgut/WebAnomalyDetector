// Express server
const express = require("express");
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '50mb'
}));
var path = require('path');
// require the model
const model = require('../model/model.js');
// require moment package for time
const moment = require("moment");

// connect to MongoDB database with Mongoose
const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/modelsDB", { useNewUrlParser: true, useUnifiedTopology: true });
// define schema for a model
const modelSchema = new mongoose.Schema({
    model_id: Number,
    upload_time: String,
    status: String
});
const Model = mongoose.model("Model", modelSchema);
// define schema for an anomaly detector information
const detectorSchema = new mongoose.Schema({
    model_id: Number,
    cf: [{
        feature1: String,
        feature2: String,
        correlation: Number,
        lin_reg: { a: Number, b: Number },
        threshold: Number,
        cx: Number,
        cy: Number
    }],
    threshold: Number,
    type: String
});
const Detector = mongoose.model("Detector", detectorSchema);

// GET request for the website main page
app.get("/", (request, response) => {
    response.sendFile(path.resolve("../view/index.html"));
});

// GET request for the stylesheet
app.get("/style.css", (request, response) => {
    response.sendFile(path.resolve("../view/style.css"));
});

// GET requests for Alertify
app.get("/alertify.css", (request, response) => {
    response.sendFile(path.resolve("../view/alertifyjs/css/alertify.css"));
});
app.get("/default.css", (request, response) => {
    response.sendFile(path.resolve("../view/alertifyjs/css/default.css"));
});
app.get("/alertify.js", (request, response) => {
    response.sendFile(path.resolve("../view/alertifyjs/alertify.js"));
});

// GET request for favicon
app.get("/favicon.png", (request, response) => {
    response.sendFile(path.resolve("../view/favicon.png"));
});
// GET request for website logo
app.get("/logo.svg", (request, response) => {
    response.sendFile(path.resolve("../view/logo.svg"));
});

// GET request for client-side JS file
app.get("/index.js", (request, response) => {
    response.sendFile(path.resolve("../view/index.js"));
});

// POST request for uploading a new model
app.post("/api/model", (request, response) => {

    // get models count from mongoDB for generating a new model id
    Model.countDocuments({}, (err, count) => {
        if (err) {
            console.log("error in countDocuments");
        }
        else {
            // get data from request body
            let data = request.body.train_data;
            // format current time
            let currTime = moment().format();
            // set id according to number of models in the DB
            let id = count + 1;
            // create the model with pending status
            let newModel = { model_id: id, upload_time: currTime, status: 'pending' };
            // send model to client
            response.send(JSON.stringify(newModel));
            // add the model to the database
            const modelEntry = new Model(newModel);
            modelEntry.save().then(() => {
                // learn the data and get the detector info
                let detData = model.learnData(data, request.query.model_type);                
                detData.model_id = id;

                // update model status to ready after learning is done
                Model.updateOne({ model_id: id }, { $set: { status: 'ready' } }).then(() => {
                    // add the new detector info to database
                    let detector = new Detector(detData);
                    detector.save();
                });

            });
        }
    });
});

// GET request for getting a model by id
app.get("/api/model", (request, response) => {
    // get the model id from query parameters
    let id = request.query.model_id;
    // find the model in the databse by model_id
    Model.findOne({ model_id: id }, { _id: 0, model_id: 1, upload_time: 1, status: 1 }, (err, model) => {
        if (err) {
            console.log("error in searching for model " + id);
        } else {
            // send found model to client
            if (model != null) {
                response.send(JSON.stringify(model));
            } else {
                // send error to client if no model with such id exists
                response.status(406).send('found no model with given id');
            }
        }
    });
});

// DELETE request for deleting a model by id
app.delete("/api/model", (request, response) => {
    // get model id from query parameters
    let id = request.query.model_id;
    // delete the model with given id from the database
    Model.deleteOne({ model_id: id }, (err, result) => {
        if (err) {
            console.log("error in deleting model " + id);
        } else {
            // if model was deleted
            if (result.deletedCount != 0) {
                // send reponse to notify client the request was succesful
                response.send();
                // delete the matching detector from the database
                Detector.deleteOne({ model_id: id }, (err) => {
                    if (err) {
                        console.log("error deleting detector " + id);
                    }
                });
            } else {
                // send error to client if no model with such id exists
                response.status(406).send('found no model with given id');
            }
        }
    });
});

// GET request for getting an array of all models
app.get("/api/models", (request, response) => {
    // get an array of all models in the database, ignoring the MongoDB id property
    Model.find({}, { _id: 0, model_id: 1, upload_time: 1, status: 1 }, (err, models) => {
        if (err) {
            console.log("error getting models");
        } else {
            // send models array to the client
            response.send(JSON.stringify(models));
        }
    });
});

// POST request for anomaly detection
app.post("/api/anomaly", (request, response) => {
    // get model id from query parameters
    let id = request.query.model_id;

    // find the matching detector info in the databse
    Detector.findOne({ model_id: id }, (err, detInfo) => {
        if (err) {
            console.log("error getting detector " + id);
        } else {
            // if the detector info was found
            if (detInfo != null) {
                // find the matching model
                Model.findOne({ model_id: id }, (err, foundModel) => {
                    if (err) {
                        console.log("error getting model " + id);
                    } else {
                        // if the model is ready
                        if (foundModel.status == 'ready') {
                            // detect anomalies from data in request body and send to client
                            let data = request.body.predict_data;
                            response.send(JSON.stringify(model.detectAnomalies(data, detInfo)));
                        }
                        else {
                            // if model is not ready then redirect client to get model
                            response.redirect(303, '/api/model?model_id=' + id);
                        }
                    }
                });
            } else {
                // send error to client if no model with such id exists
                response.status(406).send('found no model with given id');
            }
        }
    });
});

// start server at port 9876
app.listen(9876, () => {
    console.log("Server started on port 9876.")
});