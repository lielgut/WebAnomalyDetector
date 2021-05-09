const anomalyDetUtil = require("./AnomalyDetectionUtil.js");
const Point = anomalyDetUtil.Point;
const mincirc = require("./MinCircle.js"); 
const fmc = mincirc.findMinCircle;
const ts = require("./TimeSeries.js");
const TimeSeries = ts.TimeSeries;
const sad = require("./AnomalyDetector.js");
const SimpleAnomalyDetector = sad.SimpleAnomalyDetector;
const HybridAnomalyDetector = sad.HybridAnomalyDetector;


let t = new TimeSeries({"A":[1,2,3,4,5,6,7,8,9,10,11],"B":[1,3,5,7,9,11,13,15,17,19,21],"C":[1,-2,3,-4,5,-6,7,-8,9,-10,11],"D":[2,-4,6,-8,10,-12,14,-16,18,-20,22]});
let s = new HybridAnomalyDetector();
s.setCorrelationThreshold(0.9);
s.learnNormal(t);
console.log(s.getNormalModel());

let t2 = new TimeSeries({"A":[1,2,3,4,5,6,7,8,9,10,11],"B":[1,200,200,7,9,200,200,200,17,19,200],"C":[1,-2,3,-4,5,-6,7,-8,9,-10,11],"D":[2,200,200,200,200,-12,14,-16,200,200,22]});
console.log(s.detect(t2));
