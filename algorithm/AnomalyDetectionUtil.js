// based on Dr. Eliahu Khalastchi's C++ code

class Line {
    constructor(a, b) {
        if(a == undefined)
            this.a = 0;
        else
            this.a = a;
        if(b == undefined)
            this.b = 0;
        else
            this.b = b;
    }
    f(x) {
        return this.a * x + this.b;
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

function avg(values) {
    let sum = 0;
    values.forEach((x) => sum += x);
    return sum / values.length;
}

function variance(values) {
    let av = avg(values);
    let sum = 0;
    values.forEach((x) => sum += x*x);
    return sum / values.length - av*av;
}

function cov(xvals, yvals) {
    let sum = 0;
    for(var i=0; i<xvals.length; i++) {
        sum += xvals[i]*yvals[i];
    }
    sum /= xvals.length;
    return sum - avg(xvals)*avg(yvals);
}

function pearson(xvals, yvals) {
    return cov(xvals,yvals) / (Math.sqrt(variance(xvals)) * Math.sqrt(variance(yvals))); 
}

function linear_reg(points) {
    let x = [];
    let y = [];
    points.forEach((pt) => {
        x.push(pt.x);
        y.push(pt.y);
    });
    let a = cov(x, y) / variance(x);
    let b = avg(y) - a * avg(x);
    return new Line(a,b);
}

function dev(p, points) {
    let l = linear_reg(points);
    return devFromLine(p,l);
}

function devFromLine(p, l) {
    return Math.abs(p.y - l.f(p.x));
}

module.exports = {
    Line, Point, pearson, dev, linear_reg
};