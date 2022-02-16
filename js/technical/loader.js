function appendScript(baseUrl, path) {
    return new Promise((resolve, reject) => {
        const url = `${baseUrl}${path}`;
        const script = document.createElement('script');
        script.src = url;
        script.async = false;
        script.onload = resolve;
        script.onerror = e => reject(Error(`${url} failed to load`));
        document.head.appendChild(script);
    });
}

function appendAllScripts(baseUrl, paths) {
    const promises = [];
    for (let path of paths) {
        promises.push(appendScript(baseUrl, path));
    }
    return Promise.all(promises);
}

async function loadFullMod(baseUrl) {
    const indexResponse = await fetch(`${baseUrl}index.html`);
    const indexText = await indexResponse.text();
    const html = new DOMParser().parseFromString(indexText, 'text/html');

    const beforeFiles = [];
    const afterFiles = [];
    let isBefore = true;
    for (let script of html.head.getElementsByTagName('script')) {
        const src = script.attributes.src.value;
        if (!src.startsWith('js/')) {
            continue;
        }
        if (src === 'js/technical/loader.js') {
            isBefore = false;  // And do not load that file or it will try to load wrong files
        } else if (isBefore) {
            beforeFiles.push(src);
        } else {
            afterFiles.push(src);
        }
    }

    await appendAllScripts(baseUrl, beforeFiles);
    const modFiles = modInfo['modFiles'];
    if (modFiles) { // old mods don't have this, so just skip it
        await appendAllScripts(`${baseUrl}js/`, modFiles);
    }
    await appendAllScripts(baseUrl, afterFiles);

    document.body.innerHTML = html.body.innerHTML;
    load();
}

async function loadLightMod(baseUrl) {
    const beforeFiles = [
        'technical/break_eternity.js',
        'technical/layerSupport.js',
    ];
    const afterFiles = [
        'technical/temp.js',
        'technical/displays.js',
        'game.js',
        'utils.js',
        'utils/easyAccess.js',
        'technical/systemComponents.js',
        'components.js',
        'technical/canvas.js',
        'technical/particleSystem.js',
        'utils/NumberFormating.js',
        'utils/options.js',
        'utils/save.js',
        'utils/themes.js',
    ];
    await appendAllScripts('js/', beforeFiles);
    await appendScript(baseUrl, 'js/mod.js');
    await appendAllScripts(`${baseUrl}js/`, modInfo.modFiles);
    await appendAllScripts('js/', afterFiles);

    load();
    document.getElementById('loadingSection').style = 'display: none';
    document.getElementById('app').style = null;
    document.body.onmousemove = event => updateMouse(event);
}

function loadMod() {
    const params = new URLSearchParams(window.location.search);
    const user = params.get('user');
    const repo = params.get('repo') || 'The-Modding-Tree';
    const branch = params.get('branch') || 'master';
    const fullMode = params.get('mode') === 'full';
    return Promise.resolve()
        .then(async () => {
            if (!user) {
                throw new Error('GitHub user not specified');
            }
            const response = await fetch(`https://api.github.com/repos/${user}/${repo}/branches/${branch}`);
            const data = await response.json();
            if (data['message']) {
                throw Error(`Failed fetching GitHub branch: ${data['message']}`);
            }
            const commit = data['commit']['sha'];
            const baseUrl = `//cdn.jsdelivr.net/gh/${user}/${repo}@${commit}/`;

            if (fullMode) {
                await loadFullMod(baseUrl);
            } else {
                await loadLightMod(baseUrl);
            }
        })
        .catch(err => {
            console.error(err);
            setTimeout(() => {  // Run in timeout to make sure the document is ready
                document.getElementById('loadingError').innerHTML = '' + err;
                document.getElementById('loadingSection').style = 'display: none';
                document.getElementById('modSelector').style = null;
                document.getElementById('modUser').value = user;
                document.getElementById('modRepo').value = repo;
                document.getElementById('modBranch').value = branch;
                document.getElementById('modFullMode').checked = fullMode;
            }, 0);
        });
    ;
}

function selectMod(form) {
    const user = form[0].value;
    const repo = form[1].value;
    const branch = form[2].value;
    const full = form[3].checked ? '&mode=full' : '';
    window.location = `${window.location.origin}${window.location.pathname}?user=${user}&repo=${repo}&branch=${branch}${full}`;
    return false;
}

loadMod();
