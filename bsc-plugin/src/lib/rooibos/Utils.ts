import type { AnnotationExpression, AstEditor, BrsFile, ClassStatement, Expression, FunctionStatement } from 'brighterscript';
import { TokenKind, isXmlScope } from 'brighterscript';
import * as brighterscript from 'brighterscript';
import { diagnosticCorruptTestProduced } from '../utils/Diagnostics';
import type { TestSuite } from './TestSuite';

export function addOverriddenMethod(file: BrsFile, annotation: AnnotationExpression, target: ClassStatement, name: string, source: string, editor: AstEditor): boolean {
    let functionSource = `
        function ${name}()
            ${source}
        end function
    `;

    let { statements, diagnostics } = brighterscript.Parser.parse(functionSource, { mode: brighterscript.ParseMode.BrighterScript });
    let error = '';
    if (statements && statements.length > 0) {
        let statement = statements[0] as FunctionStatement;
        if (statement.func.body.statements.length > 0) {
            let p = brighterscript.createToken(brighterscript.TokenKind.Public, 'public', target.range);
            let o = brighterscript.createToken(brighterscript.TokenKind.Override, 'override', target.range);
            let n = brighterscript.createIdentifier(name, target.range);
            let method = new brighterscript.ClassMethodStatement(p, n, statement.func, o);
            //bsc has a quirk where it auto-adds a `new` method if missing. That messes with our AST editing, so
            //trigger that functionality BEFORE performing AstEditor operations. TODO remove this whenever bsc stops doing this.
            // eslint-disable-next-line @typescript-eslint/dot-notation
            target['ensureConstructorFunctionExists']?.();
            editor.addToArray(target.body, target.body.length, method);
            return true;
        }

    }
    error = diagnostics?.length > 0 ? diagnostics[0].message : 'unknown error';
    diagnosticCorruptTestProduced(file, annotation, error, functionSource);
    return false;
}

export function sanitizeBsJsonString(text: string) {
    return `"${text ? text.replace(/"/g, '\'') : ''}"`;
}

export function functionRequiresReturnValue(statement: FunctionStatement) {
    const returnTypeToken = statement.func.returnTypeToken;
    const functionType = statement.func.functionType;
    return !((functionType?.kind === TokenKind.Sub && (returnTypeToken === undefined || returnTypeToken?.kind === TokenKind.Void)) || returnTypeToken?.kind === TokenKind.Void);
}

export function getAllDottedGetParts(dg: brighterscript.DottedGetExpression) {
    let parts = [dg?.name?.text];
    let nextPart = dg.obj;
    while (brighterscript.isDottedGetExpression(nextPart) || brighterscript.isVariableExpression(nextPart)) {
        parts.push(nextPart?.name?.text);
        nextPart = brighterscript.isDottedGetExpression(nextPart) ? nextPart.obj : undefined;
    }
    return parts.reverse();
}

export function getRootObjectFromDottedGet(value: brighterscript.DottedGetExpression) {
    let root;
    if (brighterscript.isDottedGetExpression(value) || brighterscript.isIndexedGetExpression(value)) {

        root = value.obj;
        while (root.obj) {
            root = root.obj;
        }
    } else {
        root = value;
    }

    return root;
}

export function getStringPathFromDottedGet(value: brighterscript.DottedGetExpression) {
    let parts = [getPathValuePartAsString(value)];
    let root;
    root = value.obj;
    while (root) {
        if (brighterscript.isCallExpression(root) || brighterscript.isCallfuncExpression(root)) {
            return undefined;
        }
        parts.push(`${getPathValuePartAsString(root)}`);
        root = root.obj;
    }
    let joinedParts = parts.reverse().join('.');
    return joinedParts === '' ? undefined : brighterscript.createStringLiteral(joinedParts);
}

export function getPathValuePartAsString(expr: Expression) {
    if (brighterscript.isCallExpression(expr) || brighterscript.isCallfuncExpression(expr)) {
        return undefined;
    }
    if (brighterscript.isVariableExpression(expr)) {
        return expr.name.text;
    }
    if (!expr) {
        return undefined;
    }
    if (brighterscript.isDottedGetExpression(expr)) {
        return expr.name.text;
    } else if (brighterscript.isIndexedGetExpression(expr)) {
        if (brighterscript.isLiteralExpression(expr.index)) {
            return `${expr.index.token.text.replace(/^"/, '').replace(/"$/, '')}`;
        } else if (brighterscript.isVariableExpression(expr.index)) {
            return `${expr.index.name.text}`;
        }
    }
}

export function getScopeForSuite(testSuite: TestSuite) {
    if (testSuite.isNodeTest) {
        return testSuite.file.program.getScopesForFile(testSuite.file).find((scope) => {
            return isXmlScope(scope) && scope.xmlFile.componentName.text === testSuite.generatedNodeName;
        });

    } else {
        return testSuite.file.program.getFirstScopeForFile(testSuite.file);
    }
}
