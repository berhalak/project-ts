const { readdirSync, statSync, readFileSync, writeFileSync } = require('fs')
const { join, resolve, relative } = require('path')

var nl = (process.platform === 'win32' ? '\r\n' : '\n')

const readDirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())

const split = text => text.replace(/\r\n/g, "\r").replace(/\n/g, "\r").split(/\r/).filter(x=> x);

function readAllProjects(dir, projects){
	// find proj file
	const files = readdirSync(dir);
	const proj = files.find(x=> x.endsWith(".proj"));
	if (proj){
		const projPath = join(dir, proj);
		const projName = proj.replace(".proj", "");
		const content = split(readFileSync(projPath).toString());
		projects[projName] = {
			path : dir,
			refs : content
		}
	}
	const dirs = readDirs(dir).filter(x=> {
		if (x.startsWith(".") || x == "node_modules") return false;
		return true;
	});
	dirs.forEach(sub => {
		const subPath = join(dir, sub);
		readAllProjects(subPath, projects);
	})
}

function getTsFiles(dir){
	return readdirSync(dir).filter(x=> x.endsWith(".ts") && x != "import.ts" && x != "index.ts").map(x=> x.replace(".ts", ""));
}

function createIndexFile(dir){
	const subDirs = readDirs(dir).filter(x=> {
		if (x.startsWith(".") || x == "node_modules") return false;
		return true;
	})
	const files = getTsFiles(dir);
	const toGenerate = subDirs.concat(files);
	writeFileSync(join(dir, "index.ts"), toGenerate.map(x=> `export * from "./${x}"`).join(nl));
	subDirs.forEach(sub => {
		const fullPath = join(dir, sub);
		createIndexFile(fullPath);
	})
}

function createImportFile(name, path, refs, projects){	
	let content = "";
	// get full paths of refernces
	const paths = refs.map(r => {
		const proj = projects[r];
		if (!proj){
			throw new Error(`Project ${name} references invalid project ${r}`);
		}
		return relative(path, proj.path).split("\\").join("/");
	});
	content = paths.map(p => `export * from "${p}"`).join(nl);
	writeFileSync(join(path, "import.ts"), content);
}

exports.main = function(dir){
	// first read all projects
	dir = dir || process.cwd();

	const projects = {}
	readAllProjects(dir, projects);

	for(const name in projects){
		refs = projects[name].refs;
		path = projects[name].path;

		createIndexFile(path);
		if (refs && refs[0] != "export"){
			createImportFile(name, path, refs, projects);
		}
	}
}
