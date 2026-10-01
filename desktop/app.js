const host = document.querySelector('#host'), port = document.querySelector('#port'), status = document.querySelector('#status');
let busy = false;
function show(message, state = '') { status.textContent = message; status.className = state; }
window.gta.progress(message => show(message));
window.gta.settings().then(settings => { host.value = settings.host; port.value = settings.port; }).catch(error => show(error.message, 'error'));
async function run(action) {
  if (busy || !document.querySelector('form').reportValidity()) return;
  busy = true;
  document.querySelectorAll('input,button').forEach(element => element.disabled = true);
  show(action === 'check' ? 'Checking debugger and GTA…' : 'Connecting…');
  try {
    const { result, error } = await window.gta.run({ action, host: host.value.trim(), port: Number(port.value) });
    if (error) throw Error(error);
    show(action === 'check' ? `Ready — ${result.titleId} / ${result.version}. You can install the menu.` : `Menu installed — L1 + D-pad Right to open. You can close this app.${result.framesAdvancing ? '' : '\nLeave the pause menu so GTA can run it.'}`, 'success');
  } catch (error) { show(error.message, 'error'); }
  finally { busy = false; document.querySelectorAll('input,button').forEach(element => element.disabled = false); }
}
document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); run('install'); });
document.querySelector('#check').addEventListener('click', () => run('check'));
