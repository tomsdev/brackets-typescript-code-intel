{{11}}function func1() {
    // comment
}

/*
 * comment
 */
{{21}}var func2 = function() {
}

class Greeter {
    
    // comment
{{61}}greeting: string;
    
    /**
     * comment
     */
{{51}}constructor (message: string) {
		this.greeting = message;
	}
    
    /**
     * comment
     */
{{71}}public sayHello() {
		return "Hello " + this.greeting;
	}
}