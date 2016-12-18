import requestGodot from "../request";
import * as vscode from 'vscode';
import {DiagnosticCollection, DiagnosticSeverity} from 'vscode';
interface GDParseError {
  message: string,
  column: number,
  row: number
}

interface GDScript {
  members: {
    constants: {},
    functions: {},
    variables: {},
    signals: {}
  },
  base: string,
  errors: GDParseError[],
  valid: boolean,
  is_tool: boolean,
  native: string
}

interface ParseRequest {
  text: string,
  path: string
}



class GDParser {
  private _subscription: DiagnosticCollection;
  
  constructor() {
    this._subscription = vscode.languages.createDiagnosticCollection("gdscript")
  }

  dispose() {
    this._subscription.dispose()
  }

  private parseGDScript(script: GDScript, request: ParseRequest) {
    // console.log("Parse GDScript ", script);
    let canonicalFile = vscode.Uri.file(request.path);
    this._subscription.delete(canonicalFile)
    if(script.valid) { // Parse symbols
      // TODO
    }
    // Parse errors
    let diagnostics = [];
    script.errors.map( error => {
      let range = new vscode.Range(error.row-1, error.column, error.row-1, error.row + 10);
      diagnostics.push(new vscode.Diagnostic(range, error.message, DiagnosticSeverity.Error));
    });
    // Unused variables
    const checker = (name:string, line: number) => {
      const lines = request.text.split(/\r?\n/);
      const pattern = `[\\s\\+\\-\\*/%\\^\\(]${name}[^a-zA-Z_\\$]`;
      var matchs = request.text.match(new RegExp(pattern, 'gi'));
      if(matchs.length <= 1)
        diagnostics.push(new vscode.Diagnostic(new vscode.Range(line-1, lines[line-1].indexOf(name), line-1, lines[line-1].indexOf(name) + name.length), `${name} is never used.`, DiagnosticSeverity.Warning));
    };
    for (let key of Object.keys(script.members.variables))
      checker(key, script.members.variables[key]);
    for (let key of Object.keys(script.members.constants))
      checker(key, script.members.constants[key]);
    // Update diagnostics
    this._subscription.set(canonicalFile, diagnostics);    
  }

  parseDocument(doc: vscode.TextDocument) {
    if(doc.languageId == 'gdscript') {
      // console.log('[GodotTools]:start parsing document ', doc);
      const self = this;
      const request: ParseRequest = {text: doc.getText(), path: doc.fileName};
      requestGodot({action: "parsescript",request}).then((data: any)=>{
            const result: GDScript = data.result;
            if(result && vscode.window.activeTextEditor.document == doc){
              self.parseGDScript(result, request);
            }
        }).catch(e=>{
            console.error(e);
        });
    }
  }
  
}

export default GDParser;