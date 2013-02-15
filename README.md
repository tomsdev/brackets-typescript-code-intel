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
* Put it into the **www/extensions/dev** directory in the **installation folder of Brackets**
* Edit the file **www/editor/EditorUtils.js** (as Administrator in Windows):

**Find this lines** at the end of the file:

     default:
            console.log("Called EditorUtils.js _getModeFromFileExtensions with an unhandled file extension: " + ext);

**Add above it** this lines:

     case "ts":
          return "text/typescript";
          
**Save it** and you are done !

Run **Brackets** and try it.

You can open a **TypeScript project** or the **sample project** given 
with this extension in the Sample folder.

##Notes

* Syntax highlighting on TypeScript files only works with Brackets version sprint 20 (and later).

##Roadmap

* Errors in code
* Compile-on-save
* Documentation and signature viewer
