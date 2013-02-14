///<reference path='other.ts'/>
///<reference path='jquery.d.ts'/>

function func3() {
    return "func3 called";
}

/**
 * class comment
 */
class Greeter {
    
    /**
     * property comment
     */
	greeting: string;
    
    /**
     * constructor comment
     */
	constructor (message: string) {
		this.greeting = message;
        
        // jQuery auto-completion
        $('fake').css('margin-top');
	}
    
    /**
     * method comment
     */
	public sayHello() {
		return "Hello, " + this.greeting;
	}
}

// instance comment
var greeter = new Greeter("world");

greeter.greeting = "brackets";

greeter.sayHello();

var a = func1();
var b = func2();
var c = func3();
