// based on Dr. Eliahu Khalastchi's C++ code

const fs = require('fs');

class TimeSeries {
    constructor(data) {
        this.ts = data;
        this.atts = [];
        
        for(const att in data) {
            this.atts.push(att);
        }
        this.dataRowSize = this.ts[this.atts[0]].length;
    }

    getAttributeData(name) {
        return this.ts[name];
    }

    gettAttributes() {
		return this.atts;
	}

    getRowSize() {
        return this.dataRowSize;
    }
}

module.exports = { TimeSeries };