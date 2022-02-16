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
    const allMatches = [...indexText.matchAll(/<script\s+src="(js\/[^"]+)">/g)];

    const beforeFiles = [];
    const afterFiles = [];
    let isBefore = true;
    for (match of allMatches) {
        if (match[1] === 'js/technical/loader.js') {
            isBefore = false;  // And do not load that file or it will try to load wrong files
        } else if (isBefore) {
            beforeFiles.push(match[1]);
        } else {
            afterFiles.push(match[1]);
        }
    }

    await appendAllScripts(baseUrl, beforeFiles);
    await appendAllScripts(`${baseUrl}js/`, modInfo.modFiles);
    await appendAllScripts(baseUrl, afterFiles);
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
}

function loadMod() {
    return Promise.resolve()
        .then(async () => {
            const params = new URLSearchParams(window.location.search);
            const user = params.get('user');

            if (!user) {
                throw new Error('GitHub user not specified');
            }

            const repo = params.get('repo') || 'The-Modding-Tree';
            const branch = params.get('branch') || 'master';
            const response = await fetch(`https://api.github.com/repos/${user}/${repo}/branches/${branch}`);
            const data = await response.json();
            if (data["message"]) {
                throw Error(data["message"]);
            }
            const commit = data['commit']['sha'];
            const baseUrl = `//cdn.jsdelivr.net/gh/${user}/${repo}@${commit}/`;

            if (params.get('mode') === 'full') {
                await loadFullMod(baseUrl);
            } else {
                await loadLightMod(baseUrl);
            }

            load();
            document.getElementById('loadingSection').style = 'display: none';
            document.getElementById('app').style = null;
            document.body.onmousemove = event => updateMouse(event);
        })
        .catch(err => {
            console.error(err);
            setTimeout(() => {  // Run in timeout to make sure the document is ready
                document.getElementById('loadingError').innerHTML = '' + err;
                document.getElementById('loadingSection').style = 'display: none';
                document.getElementById('modSelector').style = null;
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
