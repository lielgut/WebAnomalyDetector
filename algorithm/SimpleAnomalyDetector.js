// based on Dr. Eliahu Khalastchi's C++ code

const anomalyDetUtil = require("./AnomalyDetectionUtil.js");
const Point = anomalyDetUtil.Point;
const Line = anomalyDetUtil.Line;
const pearson = anomalyDetUtil.pearson;
const dev = anomalyDetUtil.dev;
const linear_reg = anomalyDetUtil.linear_reg;
const mincircle = require("./MinCircle");
const Circle = mincircle.Circle;
const dist = mincircle.dist;
const findMinCircle = mincircle.findMinCircle;

class CorrelatedFeatures {
    constructor(feature1, feature2, correlation, lin_reg, threshold, cx, cy) {
        this.feature1 = feature1;
        this.feature2 = feature2;
        this.correlation = correlation;
        this.lin_reg = lin_reg;
        this.threshold = threshold;
        this.cx = cx;
        this.cy = cy;
    }
}

class AnomalyReport {
    constructor(description, timeStep) {
        this.description = description;
        this.timeStep = timeStep;
    }
}

class SimpleAnomalyDetector {

    constructor() {
        this.threshold = 0.9;
        this.cf = [];
    }
    getNormalModel() {
        return this.cf;
    }

    setCorrelationThreshold(threshold) {
        this.threshold = threshold;
    }

    toPoints(x, y) {
        let ps = [];
        x.forEach((x, i) => {
            ps.push(new Point(x, y[i]));
        });
        return ps;
    }

    findThreshold(ps, rl) {
        let max = 0;
        let len = ps.length;
        for (let i = 0; i < len; i++) {
            let d = Math.abs(ps[i].y - rl.f(ps[i].x));
            if (d > max)
                max = d;
        }
        return max;
    }

    learnNormal(ts) {
        let atts = ts.gettAttributes();
        let len = ts.getRowSize();
        let vals = []
        for (let i = 0; i < atts.length; i++) {
            vals.push(ts.getAttributeData(atts[i]));
        }

        for (let i = 0; i < atts.length; i++) {
            let f1 = atts[i];
            let max = 0;
            let jmax = 0;
            for (let j = i + 1; j < atts.length; j++) {
                let p = Math.abs(pearson(vals[i], vals[j], len));
                if (p > max) {
                    max = p;
                    jmax = j;
                }
            }
            let f2 = atts[jmax];
            let ps = this.toPoints(ts.getAttributeData(f1), ts.getAttributeData(f2));

            this.learnHelper(ts, max, f1, f2, ps);
        }
    }

    learnHelper(ts, p, f1, f2, ps) {
        if (p > this.threshold) {
            let l = linear_reg(ps);
            let c = new CorrelatedFeatures(
                f1,f2,p,l,this.findThreshold(ps, l) * 1.1,0,0);
            this.cf.push(c);
        }
    }

    detect(ts) {
        // vector of anomaly reports.
        let v = [];
        this.cf.forEach(c => {
            let x = ts.getAttributeData(c.feature1);
            let y = ts.getAttributeData(c.feature2);
            for (let i = 0; i < x.length; i++) {
                if (this.isAnomalous(x[i], y[i], c)) {
                    let d = c.feature1 + "-" + c.feature2;
                    v.push(new AnomalyReport(d, i));
                }
            }
        });
        return v;
    }

    isAnomalous(x, y, c) {
        return (Math.abs(y - c.lin_reg.f(x)) > c.threshold);
    }
}

class HybridAnomalyDetector extends SimpleAnomalyDetector {
    learnHelper(ts, p, f1, f2, ps) {
        if(p < this.threshold) {
            if(p > 0.5) {
                let cl = findMinCircle(ps);
                let c = new CorrelatedFeatures(f1,f2,p,new Line(0,0),cl.radius * 1.1, cl.center.x, cl.center.y);
                this.cf.push(c);
            }    
        } else {
            super.learnHelper(ts,p,f1,f2,ps);
        }
    }

    isAnomalous(x, y, c) {
        return (c.correlation>=this.threshold && super.isAnomalous(x,y,c)) ||
			(c.correlation>0.5 && c.correlation< this.threshold && dist(new Point(c.cx,c.cy),new Point(x,y))>c.threshold);
    }
}

module.exports = {
    SimpleAnomalyDetector, HybridAnomalyDetector, CorrelatedFeatures, AnomalyReport
};