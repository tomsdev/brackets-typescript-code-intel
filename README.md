Brackets TypeScript Code Intel 
-------------------

This extension adds support for writing **TypeScript in Brackets** ! 

For the moment, **it includes**:

* Smart code **auto-completion**
* **External files inclusion** with references ( **.ts** and **.d.ts** )
* **Quick Edit** (open the declaration of what you clicked on)

![TypeScript auto-completion screenshot](http://i.minus.com/jBFtqwppfaQ1d.PNG "TypeScript auto-completion screenshot")

![TypeScript auto-completion screenshot](http://i.minus.com/jbpJxdk9UBkkUA.PNG "TypeScript auto-completion screenshot")

##Installation

* **Download and install Brackets**: http://download.brackets.io/
* **Download or clone this extension** from this repository
* Put it into the **src/extensions/dev directory of Brackets**
* Edit the file **src/editor/EditorUtils.js**:

**Find this lines** at the end of the file:

     case "hx":
          return "haxe";

**Add below it** this lines:

     case "ts":
          return "text/typescript";
          
**Save it** and you are done !

Run **Brackets** and try it.

You can open a **TypeScript project** or the **sample project** given 
with this extension in the Sample folder.

