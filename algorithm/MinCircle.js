// based on Dr. Eliahu Khalastchi's C++ code

const enclosingCircle = require('smallest-enclosing-circle');

function dist(a, b) {
    let x2=(a.x-b.x)*(a.x-b.x);
	let y2=(a.y-b.y)*(a.y-b.y);
	return Math.sqrt(x2+y2);
}

function from2points(a, b) {
    let x0=(a.x+b.x)/2;
	let y0=(a.y+b.y)/2;
	let r=dist(a,b)/2;
	return {center:{x: x0, y: y0}, radius: r};
}

function from3Points(a, b, c){
	// find the circumcenter of the triangle a,b,c
	let mAB = new Point((a.x+b.x)/2 , (a.y+b.y)/2); // mid point of line AB
	let slopAB = (b.y - a.y) / (b.x - a.x); // the slop of AB
	let pSlopAB = - 1/slopAB; // the perpendicular slop of AB
	// pSlop equation is:
	// y - mAB.y = pSlopAB * (x - mAB.x) ==> y = pSlopAB * (x - mAB.x) + mAB.y
	
	let mBC = new Point((b.x+c.x)/2 , (b.y+c.y)/2); // mid point of line BC
	let slopBC = (c.y - b.y) / (c.x - b.x); // the slop of BC
	let pSlopBC = - 1/slopBC; // the perpendicular slop of BC
	// pSlop equation is:
	// y - mBC.y = pSlopBC * (x - mBC.x) ==> y = pSlopBC * (x - mBC.x) + mBC.y
	
	/*
	pSlopAB * (x - mAB.x) + mAB.y = pSlopBC * (x - mBC.x) + mBC.y
	pSlopAB*x - pSlopAB*mAB.x + mAB.y = pSlopBC*x - pSlopBC*mBC.x + mBC.y
	
	x*(pSlopAB - pSlopBC) = - pSlopBC*mBC.x + mBC.y + pSlopAB*mAB.x - mAB.y
	x = (- pSlopBC*mBC.x + mBC.y + pSlopAB*mAB.x - mAB.y) / (pSlopAB - pSlopBC);
	
	*/
	
	let x0 = (- pSlopBC*mBC.x + mBC.y + pSlopAB*mAB.x - mAB.y) / (pSlopAB - pSlopBC);
	let y0 = pSlopAB * (x - mAB.x) + mAB.y;
	let ctr = {x: x0, y: y0};
	let R=dist(ctr,a);
	
	return {center: ctr, radius: R};
}

function trivial(P){
	if(P.length==0)
		return {center:{x: 0, y:0}, radius: 0};
	else if(P.length==1)
		return {center:P[0], radius: 0};
	else if (P.length==2)
		return from2points(P[0],P[1]);

	// maybe 2 of the points define a small circle that contains the 3ed point
	let c = from2points(P[0],P[1]);
	if(dist(P[2],c.center)<=c.radius)
		return c;
	c=from2points(P[0],P[2]);
	if(dist(P[1],c.center)<=c.radius)
		return c;
	c=from2points(P[1],P[2]);
	if(dist(P[0],c.center)<=c.radius)
		return c;
	// else find the unique circle from 3 points
	return from3Points(P[0],P[1],P[2]);
}

/*
algorithm welzl
    input: Finite sets P and R of points in the plane |R|<= 3.
    output: Minimal disk enclosing P with R on the boundary.

    if P is empty or |R| = 3 then
        return trivial(R)
    choose p in P (randomly and uniformly)
    D := welzl(P - { p }, R)
    if p is in D then
        return D

    return welzl(P - { p }, R U { p })
 */
    function welzl(P,R,n){
        if(n==0 || R.length==3){
            return trivial(R);
        }
    
        // remove random point p
        // swap is more efficient than remove
        //srand (time(NULL));
        let i= Math.floor(Math.random() * n);
        let p = new Point(P[i].x,P[i].y);
        [P[i], P[n-1]] = [P[n-1], P[i]]; // swap
    
        let c=welzl(P,R,n-1);
    
        if(dist(p,c.center)<=c.radius)
            return c;
    
        R.push(p);
    
        return welzl(P,R,n-1);
    }
    
    function findMinCircle(points){
		let res = enclosingCircle(points);
		return {center: {x: res.x, y: res.y}, radius: res.r};
        // return welzl(points,[],points.length);
    }

    module.exports = {
        findMinCircle, dist
    };