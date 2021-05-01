// based on Dr. Eliahu Khalastchi's C++ code

const anomalyDetUtil = require("./AnomalyDetectionUtil.js");
const pearson = anomalyDetUtil.pearson;
const eval = anomalyDetUtil.eval;
const linear_reg = anomalyDetUtil.linear_reg;
const mincircle = require("./MinCircle");
const dist = mincircle.dist;
const findMinCircle = mincircle.findMinCircle;

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
        x.forEach((x0, i) => {
            ps.push({x: x0, y: y[i]});
        });
        return ps;
    }

    findThreshold(ps, rl) {
        let max = 0;
        let len = ps.length;
        for (let i = 0; i < len; i++) {
            let d = Math.abs(ps[i].y - eval(rl,ps[i].x));
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
            let c = {
                feature1: f1,
                feature2: f2,
                correlation: p,
                lin_reg: l,
                threshold: this.findThreshold(ps, l) * 1.1,
                cx: 0,
                cy: 0
            };
            this.cf.push(c);
        }
    }

    detect(ts) {        
        let reports = {};
        this.cf.forEach(c => {
            let spans = [];
            let st;
            let x = ts.getAttributeData(c.feature1);
            let y = ts.getAttributeData(c.feature2);
            for (let i = 0; i < x.length; i++) {
                if (this.isAnomalous(x[i], y[i], c)) {
                    if(st == undefined) {
                        st = i;
                    }
                    if(i == x.length - 1) {
                        spans.push([st,i+1]);
                    }
                } else {                    
                    if(st != undefined) {
                        spans.push([st,i]);
                        st = undefined;               
                    }
                }
            }
            reports[c.feature1] = spans;
        });
        return reports;
    }

    isAnomalous(x, y, c) {
        return (Math.abs(y - eval(c.lin_reg,x)) > c.threshold);
    }
}

class HybridAnomalyDetector extends SimpleAnomalyDetector {
    learnHelper(ts, p, f1, f2, ps) {
        if(p < this.threshold) {
            if(p > 0.5) {
                let cl = findMinCircle(ps);
                let c = {
                    feature1: f1,
                    feature2: f2,
                    correlation: p,
                    lin_reg: {a: 0, b: 0},
                    threshold: cl.radius * 1.1,
                    cx: cl.center.x,
                    cy: cl.center.y
                };
                this.cf.push(c);
            }    
        } else {
            super.learnHelper(ts,p,f1,f2,ps);
        }
    }

    isAnomalous(x0, y0, c) {
        return (c.correlation>=this.threshold && super.isAnomalous(x0,y0,c)) ||
			(c.correlation>0.5 && c.correlation< this.threshold && dist({x: c.cx, y: c.cy},{x: x0, y: y0})>c.threshold);
    }
}

module.exports = {
    SimpleAnomalyDetector, HybridAnomalyDetector
};