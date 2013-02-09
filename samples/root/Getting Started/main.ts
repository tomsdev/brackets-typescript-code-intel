///<reference path='ext.ts'/>
///<reference path='other.ts'/>

// function doc
function blabla() {
    return "toto mod";
}

// class doc
class Greeter {
    
    // property doc
	greeting: string;
    
    // constructor doc
	constructor (message: string) {
		this.greeting = message;
	}
    
    /**
     * Creates a new Circle from a diameter.
     *
     * @param {number} nb The desired diameter of the circle.
     * @return {string} The new Circle object.
     */
	public waza(nb: number) {
		return "Hello, " + this.greeting;
	}
}

// instance doc
var greeter = new Greeter("world");

greeter.greeting = "yes";

blabla();

otherFn("ty");

greeter.waza(123);