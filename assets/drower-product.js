// (function () {
//   'use strict';

//   // Funzione per spostare i drawer alla radice del <body>
//   function relocateDrawers() {
//     var modals = document.querySelectorAll('.js-drawer-modal');
//     modals.forEach(function (modal) {
//       if (modal.parentNode !== document.body) {
//         document.body.appendChild(modal);
//       }
//     });
//   }

//   // Apri il drawer specificato
//   function openDrawer(targetId) {
//     relocateDrawers(); // Assicura che sia nel body prima di aprire
//     var modal = document.getElementById(targetId);
//     if (!modal) return;

//     modal.classList.add('is-active');
//     modal.setAttribute('aria-hidden', 'false');
//     document.body.style.overflow = 'hidden';
//     document.documentElement.style.overflow = 'hidden';

//     setTimeout(function () {
//       window.dispatchEvent(new Event('resize'));
//     }, 150);
//   }

//   // Chiudi il drawer
//   function closeDrawer(modal) {
//     if (!modal) return;
//     modal.classList.remove('is-active');
//     modal.setAttribute('aria-hidden', 'true');
//     document.body.style.overflow = '';
//     document.documentElement.style.overflow = '';
//   }

//   function closeAllDrawers() {
//     document.querySelectorAll('.js-drawer-modal.is-active').forEach(closeDrawer);
//   }

//   // Event Delegation globale sui click
//   document.addEventListener('click', function (e) {
//     // 1. Click su Trigger (Badge)
//     var trigger = e.target.closest('.js-drawer-trigger');
//     if (trigger) {
//       e.preventDefault();
//       e.stopPropagation();
//       var targetId = trigger.getAttribute('data-target');
//       if (targetId) {
//         openDrawer(targetId);
//       }
//       return;
//     }

//     // 2. Click su Pulsante di chiusura
//     var closeBtn = e.target.closest('.js-drawer-close');
//     if (closeBtn) {
//       e.preventDefault();
//       var modal = closeBtn.closest('.js-drawer-modal');
//       closeDrawer(modal);
//       return;
//     }

//     // 3. Click sull'overlay esterno (sfondo)
//     if (e.target.classList.contains('js-drawer-modal')) {
//       closeDrawer(e.target);
//     }
//   });

//   // Chiusura con il tasto ESC
//   document.addEventListener('keydown', function (e) {
//     if (e.key === 'Escape') {
//       closeAllDrawers();
//     }
//   });

//   // Esegui lo spostamento iniziale al caricamento
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', relocateDrawers);
//   } else {
//     relocateDrawers();
//   }
// })();


(function () {
  'use strict';

  function openDrawer(targetId) {
    var modal = document.getElementById(targetId);
    if (!modal) return;

    // Sposta nel body solo al primo click per non impattare il caricamento della pagina
    if (modal.parentNode !== document.body) {
      document.body.appendChild(modal);
    }

    // Mostra il drawer
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    // Attiva l'animazione al frame successivo
    requestAnimationFrame(function () {
      modal.classList.add('is-active');
    });

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  function closeDrawer(modal) {
    if (!modal) return;

    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');

    // Nasconde l'elemento dopo il completamento dell'animazione (350ms)
    setTimeout(function () {
      if (!modal.classList.contains('is-active')) {
        modal.style.display = 'none';
      }
    }, 350);

    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  // Gestione click differita (zero impatto sulle prestazioni)
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.js-drawer-trigger');
    if (trigger) {
      e.preventDefault();
      var targetId = trigger.getAttribute('data-target');
      if (targetId) openDrawer(targetId);
      return;
    }

    var closeBtn = e.target.closest('.js-drawer-close');
    if (closeBtn) {
      e.preventDefault();
      var modal = closeBtn.closest('.js-drawer-modal');
      closeDrawer(modal);
      return;
    }

    if (e.target.classList.contains('js-drawer-modal')) {
      closeDrawer(e.target);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var activeModal = document.querySelector('.js-drawer-modal.is-active');
      if (activeModal) closeDrawer(activeModal);
    }
  });
})();