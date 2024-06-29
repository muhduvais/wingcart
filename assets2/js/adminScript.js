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

document.getElementById('table-body').addEventListener('click', async (event) => {
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
})

async function updateBlockStatus(userId, isBlocked) {
  const response = await fetch(`/admin/userListed/${userId}`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, isBlocked })
  });
  const data = await response.json();
  console.log(data)
  if(response.ok){
    location.reload() //toastify or sweet alert
  }
  else{
    alert('Something went wrong')
  }
}