// based on Dr. Eliahu Khalastchi's C++ code

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
    let a0 = cov(x, y) / variance(x);
    let b0 = avg(y) - a0 * avg(x);
    return {a: a0, b: b0};
}

function dev(p, points) {
    let l = linear_reg(points);
    return devFromLine(p,l);
}

function devFromLine(p, l) {
    return Math.abs(p.y - eval(l,p.x));
}

function eval(l, x) {
    return l.a * x + l.b;
}

module.exports = {
    pearson, dev, linear_reg, eval
};