document.addEventListener('DOMContentLoaded', () => {

// function toggleBlock(button, user_id) {
//   console.log(user_id);
//   if (button.textContent.trim() === 'Block') {
//     button.textContent = 'Unblock';
//     updateBlockStatus(user_id, false)
//   } else {
//     button.textContent = 'Block';
//     updateBlockStatus(user_id, true)
//   }

// }

// Users-list-block-or-unblock
const userTableBody = document.getElementById('user-table-body');

if (userTableBody) {
  userTableBody.addEventListener('click', async (event) => {
    if (event.target.id == 'block-btn') {
      event.preventDefault();
  
      const userId = event.target.getAttribute('data-user-id');
      updateBlockStatus(userId, false);
    }
    else if(event.target.id == 'unblock-btn'){
      event.preventDefault();
  
      const userId = event.target.getAttribute('data-user-id');
      updateBlockStatus(userId, true);
    }
  });
}

async function updateBlockStatus(userId, isBlocked) {
  try {
    const response = await fetch(`/admin/userListed/${userId}`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, isBlocked })
    });
    const data = await response.json();
    
    if (response.ok) {
      // Sweet Alert
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: data.message
      }).then(() => {
        location.reload();
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Something went wrong'
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred. Please try again.'
    });
  }
}

// Category-list-or-unlist
const categoryTableBody = document.getElementById('category-table-body');
categoryTableBody.addEventListener('click', async (event) => {
  if (event.target.id == 'list-btn') {
    event.preventDefault();

    const categoryId = event.target.getAttribute('data-category-id');
    updateListStatus(categoryId, false);
  }
  else if(event.target.id == 'unlist-btn'){
    event.preventDefault();

    const categoryId = event.target.getAttribute('data-category-id');
    updateListStatus(categoryId, true);
  }
})

async function updateListStatus(categoryId, isListed) {
  try {
    const response = await fetch(`/admin/categoryListed/${categoryId}`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ categoryId, isListed })
    });
    const data = await response.json();
    if (response.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: data.message
      }).then(() => {
        location.reload();
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Something went wrong'
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred. Please try again.'
    });
  }
}

});
