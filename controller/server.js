const express = require("express");
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '50mb'
}));
var path = require('path');

const model = require('../model/model.js');

const moment = require("moment");
const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/modelsDB", { useNewUrlParser: true, useUnifiedTopology: true });

const modelSchema = new mongoose.Schema({
    model_id: Number,
    upload_time: String,
    status: String
});
const Model = mongoose.model("Model", modelSchema);

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


app.get("/", (request, response) => {
    response.sendFile(path.resolve("view/index.html"));
});

app.get("/style.css", (request, response) => {
    response.sendFile(path.resolve("view/style.css"));
});

app.get("/favicon.png", (request, response) => {
    response.sendFile(path.resolve("view/favicon.png"));
});
app.get("/logo.svg", (request, response) => {
    response.sendFile(path.resolve("view/logo.svg"));
});

app.get("/index.js", (request, response) => {
    response.sendFile(path.resolve("view/index.js"));
});


app.post("/api/model", (request, response) => {

    Model.countDocuments({}, (err, count) => {
        if (err) {
            console.log("error in countDocuments");
        }
        else {
            let data = request.body.train_data;
            let currTime = moment().format();
            let id = count + 1;
            let newModel = { model_id: id, upload_time: currTime, status: 'pending' };
            response.send(JSON.stringify(newModel));
            const modelEntry = new Model(newModel);
            modelEntry.save().then(() => {
                
                let detData = model.learnData(data,request.query.model_type);
                detData.model_id = id;

                Model.updateOne({ model_id: id }, { $set: { status: 'ready' } }).then(() => {                
                    let detector = new Detector(detData);
                    detector.save();
                });

            });
        }
    });
});

app.get("/api/model", (request, response) => {
    let id = request.query.model_id;
    Model.findOne({ model_id: id }, { _id: 0, model_id: 1, upload_time: 1, status: 1 }, (err, model) => {
        if (err) {
            console.log("error deleting model " + id);
        } else {
            if (model != null) {
                response.send(JSON.stringify(model));
            } else {
                response.status(406).send('found no model with given id');
            }
        }
    });
});

app.delete("/api/model", (request, response) => {
    let id = request.query.model_id;
    Model.deleteOne({ model_id: id }, (err, result) => {
        if (err) {
            // ...
        } else {
            if (result.deletedCount != 0) {
                response.send();
                Detector.deleteOne({ model_id: id }, (err) => {
                    if (err) {
                        console.log("error deleting detector " + id);
                    }
                });
            } else {
                response.status(406).send('found no model with given id');
            }
        }
    });
});

app.get("/api/models", (request, response) => {
    Model.find({}, { _id: 0, model_id: 1, upload_time: 1, status: 1 }, (err, models) => {
        if (err) {
            console.log("error getting models");
        } else {
            response.send(JSON.stringify(models));
        }
    });
});

app.post("/api/anomaly", (request, response) => {
    let id = request.query.model_id;

    Detector.findOne({ model_id: id }, (err, detInfo) => {
        if (err) {
            console.log("error getting detector " + id);
        } else {
            if (detInfo != null) {
                Model.findOne({ model_id: id }, (err, foundModel) => {
                    if (err) {
                        console.log("error getting model " + id);
                    } else {
                        if (foundModel.status == 'ready') {
                            let data = request.body.predict_data;                    
                            response.send(JSON.stringify(model.detectAnomalies(data, detInfo)));
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

app.listen(9876, () => {
    console.log("Server started on port 9876.")
});