const anomDet = require('./AnomalyDetector.js');
const ts = require('./TimeSeries.js');
const TimeSeries = ts.TimeSeries;
const SimpleAnomalyDetector = anomDet.SimpleAnomalyDetector;
const HybridAnomalyDetector = anomDet.HybridAnomalyDetector;

// returns an anomaly detectors depending on the model type
function getDetector(modelType, timeseries) {
    let det;
    if (modelType == 'regression') {
        det = new SimpleAnomalyDetector();
    } else if (modelType == 'hybrid') {
        det = new HybridAnomalyDetector();
    }
    // learn from timeseries if given
    if(timeseries != undefined) {
        det.learnNormal(timeseries);
    }
    return det;
}

// create detector from given model type and data and return its data
function learnData(data, modelType) {    
    let det = getDetector(modelType, new TimeSeries(data));
    let detData = { cf: det.cf, threshold: det.threshold, type: modelType };
    return detData;
}

// detect anomalies in given data according to a detector information
function detectAnomalies(data, detInfo) {
    let det = getDetector(detInfo.type);
    det.cf = detInfo.cf;
    det.threshold = detInfo.threshold;
    return det.detect(new TimeSeries(data));
}

module.exports = {
    learnData, detectAnomalies
}