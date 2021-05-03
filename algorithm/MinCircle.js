// based on Dr. Eliahu Khalastchi's C++ code

const enclosingCircle = require('smallest-enclosing-circle');

function dist(a, b) {
    let x2=(a.x-b.x)*(a.x-b.x);
	let y2=(a.y-b.y)*(a.y-b.y);
	return Math.sqrt(x2+y2);
}

function findMinCircle(points){
	let res = enclosingCircle(points);
	return {center: {x: res.x, y: res.y}, radius: res.r};
	// return welzl(points,[],points.length);
}

module.exports = {
	findMinCircle, dist
};