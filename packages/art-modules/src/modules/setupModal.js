/**
 * Modal management: show, hide, and draggable behavior.
 */

/**
 * Initialize modal functionality and return a showModal callback.
 * @param {Object} imagesMap - Mapping from interactive names to metadata ({ title, description, author, img }).
 * @returns {Function} showModal(userData)
 */
export function setupModal(imagesMap) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalLoader = document.getElementById('modalLoader');
    const modalImg = document.getElementById('modalImage');
    const modalDesc = modalOverlay.querySelector('.modal-description');
    const closeBtn = document.getElementById('closeModal');
    const sidebar = document.querySelector('.sidebar');
    const btn = document.getElementById('btn');
    const modal = modalOverlay.querySelector('.modal');
  
    let draggableInitialized = false;
  
    modalLoader.classList.add('hidden');
    modalImg.classList.add('hidden');
  
    modalOverlay.addEventListener('pointerdown', (e) => {
      if (!modal.contains(e.target)) hideModal();
    });
    closeBtn.addEventListener('click', hideModal);
    modal.style.transform = '';
  
    function hideModal() {
      modal.style.transform = '';
      modalOverlay.classList.add('hidden');
      modalOverlay.classList.remove('show');
      modalImg.src = '';
      modalDesc.textContent = '';
      modalLoader.classList.add('hidden');
      modalImg.classList.add('hidden');
    }
  
    return function showModal(userData) {
      if (!userData?.name) return;
  
      if (sidebar?.classList.contains('open')) {
        sidebar.classList.remove('open');
        btn?.classList.remove('open');
      }
  
      const meta = imagesMap[userData.name];
      if (!meta) return;
  
      modalOverlay.classList.remove('hidden');
      modalOverlay.classList.add('show');
  
      modalDesc.innerHTML = `
        <h3>${meta.title}</h3>
        <p>${meta.description || ''}</p>
        ${meta.author ? `<p><em>By ${meta.author}</em></p>` : ''}
      `;
  
      modalLoader.classList.remove('hidden');
      modalImg.classList.add('hidden');
  
      if (meta.img) {
        modalImg.src = meta.img.src;
        modalImg.onload = () => {
          modalLoader.classList.add('hidden');
          modalImg.classList.remove('hidden');
        };
        modalImg.onerror = () => {
          modalLoader.classList.add('hidden');
          modalDesc.textContent = 'Failed to load image.';
        };
      } else {
        modalLoader.classList.add('hidden');
        modalDesc.textContent = 'Image not preloaded.';
      }
  
      if (!draggableInitialized) {
        modal.style.transform = '';
        makeModalDraggable(modal);
        draggableInitialized = true;
      }
    };
  }
  
  /**
   * Make a popup element draggable via pointer events.
   * @param {HTMLElement} popup - The element to drag.
   * @param {HTMLElement} [handle=popup] - The drag handle element.
   */
  export function makeModalDraggable(popup, handle = popup) {
    handle.style.cursor = 'move';
    handle.style.userSelect = 'none';
  
    let startX, startY;
    let baseX = 0, baseY = 0;
    let dragging = false;
  
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
  
      startX = e.clientX;
      startY = e.clientY;
  
      const cs = getComputedStyle(popup);
      const matrix = new DOMMatrixReadOnly(
        cs.transform === 'none' ? 'matrix(1,0,0,1,0,0)' : cs.transform
      );
      baseX = matrix.m41;
      baseY = matrix.m42;
  
      dragging = true;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    });
  
    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      popup.style.transform = `translate(${baseX + dx}px, ${baseY + dy}px)`;
    }
  
    function onPointerUp() {
      dragging = false;
      document.removeEventListener('pointermove', onPointerMove);
    }
  }
  