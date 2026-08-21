

const { ipcRenderer } = require('electron');

const donorForm = document.getElementById('donor-form');
const tableBody = document.getElementById('donor-list-body');
let editMode = false;
let currentEditId = null;
const submitBtn = donorForm.querySelector('button[type="submit"]');
require('electron').webFrame.setZoomLevel(0);


// 1. INITIALIZE PAGE
window.addEventListener('DOMContentLoaded', async () => {
    loadDonors();
    document.getElementById('auto-date').value = new Date().toISOString().split('T')[0];
});

// 2. LOAD FROM DATABASE
async function loadDonors() {
    const donors = await ipcRenderer.invoke('get-donors');
    tableBody.innerHTML = ''; 
    if (donors) {
        donors.forEach(donor => renderRow(donor));
    }
}

// 3. SAVE TO DATABASE (Triggers on Submit)
donorForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const newDonor = {
        id: Date.now(),
        lastName: document.getElementById('lastName').value,
        firstName: document.getElementById('firstName').value,
        bloodType: document.getElementById('bloodType').value,
        pocheType: document.getElementById('pocheType').value,
        date: document.getElementById('auto-date').value
    };

    const result = await ipcRenderer.invoke('save-donor', newDonor);
    
    if (result.success) {
        renderRow(newDonor);
        showToast("Donor add successfully!");
        donorForm.reset();
        document.getElementById('auto-date').value = new Date().toISOString().split('T')[0];
    }
});

// 4. RENDER TABLE ROW
function renderRow(donor) {
    const row = tableBody.insertRow();
    row.innerHTML = `
        <td><strong>${donor.lastName}</strong></td>
        <td>${donor.firstName}</td>
        <td><span class="badge badge-red">${donor.bloodType}</span></td>
        <td><span class="poche-pill">${donor.pocheType}</span></td>
        <td>${donor.date}</td>
        <td class="action-cell">
            <button class="action-btn menu-trigger"><i class='bx bx-dots-vertical-rounded'></i></button>
            <div class="action-menu">
                <a href="#" class="print-opt"><i class='bx bx-printer'></i> Print Ticket</a>
                <a href="#" class="edit-opt"><i class='bx bx-edit'></i> Edit</a>
                <a href="#" class="delete-opt"><i class='bx bx-trash'></i> Remove</a>
            </div>
        </td>
    `;

    // Add event listeners for the new row's actions
    const menuBtn = row.querySelector('.menu-trigger');
    const printBtn = row.querySelector('.print-opt');
    const deleteBtn = row.querySelector('.delete-opt');
    const editBtn = row.querySelector('.edit-opt');
     

    menuBtn.onclick = () => {
        document.querySelectorAll('.action-menu').forEach(m => m.style.display = 'none');
        row.querySelector('.action-menu').style.display = 'block';
    };

    printBtn.onclick = () => printTicket(donor);
    
    

// Inside your renderRow(donor) function:

deleteBtn.onclick = () => {
    const modal = document.getElementById('delete-modal');
    const modalText = document.getElementById('modal-text');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    modalText.innerText = `Delete donor: ${donor.lastName}?`;
    modal.style.display = 'flex';

    // Handle "Yes"
    yesBtn.onclick = async () => {
        const result = await ipcRenderer.invoke('delete-donor', donor.id);
        if (result.success) {
            row.remove();
            modal.style.display = 'none';
            // Immediately focus back to form
            document.getElementById('lastName').focus();
            showToast("Donor removed from database", "success");
        }
    };

    // Handle "No"
    noBtn.onclick = () => {
        modal.style.display = 'none';
        document.getElementById('lastName').focus();
    };

    
    
};

editBtn.onclick = () => {
    currentEditId = donor.id;

    // Fill the inputs
    document.getElementById('lastName').value = donor.lastName;
    document.getElementById('firstName').value = donor.firstName;
    document.getElementById('bloodType').value = donor.bloodType;
    document.getElementById('pocheType').value = donor.pocheType;
    document.getElementById('auto-date').value = donor.date;

    // UI Toggle: Hide Add, Show Edit/Cancel
    addBtn.style.display = 'none';
    editBtnControl.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
    
    document.getElementById('lastName').focus();
};



}

// 5. PRINTING LOGIC (Includes QR Generation)
function printTicket(donor) {
    const printWindow = window.open('', '_blank', 'width=350,height=450');
    printWindow.document.write(`
        <html>
        <head>
            <title>Ticket ${donor.lastName}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 20px; }
                .ticket { border: 2px dashed #333; padding: 15px; border-radius: 10px; }
                .blood-large { font-size: 45px; color: #e53935; font-weight: bold; margin: 10px 0; }
                #qr-container { display: flex; justify-content: center; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <h2 style="margin:0;">BLOOD BANK</h2>
                <hr>
                <p><strong>DONOR:</strong> ${donor.lastName} ${donor.firstName}</p>
                <div class="blood-large">${donor.bloodType}</div>
                <p><strong>POCHE:</strong> ${donor.pocheType}</p>
                <p><strong>DATE:</strong> ${donor.date}</p>
                <div id="qr-container"></div>
            </div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
            <script>
                window.onload = function() {
                    new QRCode(document.getElementById("qr-container"), {
                        text: "ID:${donor.id}|${donor.lastName}|${donor.bloodType}",
                        width: 100, height: 100
                    });
                    setTimeout(() => { window.print(); window.close(); }, 600);
                }
            <\/script>
        </body>
        </html>
    `);
}

// Close menus when clicking elsewhere
window.onclick = (e) => {
    if (!e.target.matches('.bx-dots-vertical-rounded')) {
        document.querySelectorAll('.action-menu').forEach(m => m.style.display = 'none');
    }
};
const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // This forces Electron to refresh the entire window environment
        window.location.replace('../views/login.html'); 
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        // Force the cursor to the username box
        usernameInput.focus();
        console.log("Login inputs focused and ready.");
    }
});

const addBtn = document.getElementById('add-btn');
const editBtnControl = document.getElementById('edit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const statusMsg = document.getElementById('status-msg');

// 1. Function to show success message (similar to your delete modal style)
function showStatus(text, color) {
    statusMsg.innerText = text;
    statusMsg.style.backgroundColor = color;
    statusMsg.style.color = "white";
    statusMsg.style.display = "block";
    setTimeout(() => { statusMsg.style.display = "none"; }, 3000);
}


// 3. New Specific Edit Click Handler
editBtnControl.onclick = async () => {
    const updatedData = {
        id: currentEditId,
        lastName: document.getElementById('lastName').value,
        firstName: document.getElementById('firstName').value,
        bloodType: document.getElementById('bloodType').value,
        pocheType: document.getElementById('pocheType').value,
        date: document.getElementById('auto-date').value
    };

    const result = await ipcRenderer.invoke('update-donor', updatedData);
    
    if (result.success) {
       /* showStatus("Donor Updated Successfully!", "#2ecc71");*/
        showToast("Donor updated successfully!");
        resetForm();
        loadDonors(); // Refresh table
    }
};

/* toast function */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');

    // Set the message
    toastText.innerText = message;

    // Set color based on type (Success or Error)
    toast.style.backgroundColor = type === 'success' ? '#2ecc71' : '#e74c3c';

    // Show the toast
    toast.classList.remove('toast-hidden');
    toast.classList.add('toast-visible');

    // Hide it automatically after 3 seconds
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hidden');
    }, 3000);
}


/* cancel button function */
cancelBtn.onclick = () => resetForm();

function resetForm() {
    donorForm.reset();
    addBtn.style.display = 'inline-block';
    editBtnControl.style.display = 'none';
    cancelBtn.style.display = 'none';
    currentEditId = null;
    // Reset date to today
    document.getElementById('auto-date').value = new Date().toISOString().split('T')[0];
}






























// Inside renderRow(donor)
 



//handle the forme update 
/**
donorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const donorData = {
        lastName: document.getElementById('lastName').value,
        firstName: document.getElementById('firstName').value,
        bloodType: document.getElementById('bloodType').value,
        pocheType: document.getElementById('pocheType').value,
        date: document.getElementById('auto-date').value
    };

    if (editMode) {
        // UPDATE LOGIC
        donorData.id = currentEditId;
        const result = await ipcRenderer.invoke('update-donor', donorData);
        if (result.success) {
            editMode = false;
            currentEditId = null;
            submitBtn.innerHTML = "<i class='bx bx-plus-circle'></i> Add Donor";
            submitBtn.style.backgroundColor = ""; // Reset to original CSS
            loadDonors(); // Refresh the table
            donorForm.reset();
        }
    } else {
        // ADD LOGIC (Your existing code)
        donorData.id = Date.now();
        const result = await ipcRenderer.invoke('save-donor', donorData);
        if (result.success) {
            renderRow(donorData);
            donorForm.reset();
        }
    }
});   */
