document.addEventListener('DOMContentLoaded', () => {

    // Load and display saved notes on page load
    loadAndDisplayNotes();

    document.getElementById('summarizeBtn').addEventListener('click', () => summarizeText(method = 'summarize'));
    document.getElementById('citationsBtn').addEventListener('click', () => summarizeText(method = 'suggest'));

    // New event listeners for the notes modal
    document.getElementById('notesBtn').addEventListener('click', openNotesModal);
    document.getElementById('closeModal').addEventListener('click', closeNotesModal);
    document.getElementById('saveNewNoteBtn').addEventListener('click', saveNewNote);
    document.getElementById('cancelNoteBtn').addEventListener('click', closeNotesModal);

    // Event listeners for view note modal
    document.getElementById('closeViewModal').addEventListener('click', closeViewNoteModal);

    // Close modals when clicking outside of them
    document.getElementById('notesModal').addEventListener('click', function (event) {
        if (event.target === this) {
            closeNotesModal();
        }
    });

    document.getElementById('viewNoteModal').addEventListener('click', function (event) {
        if (event.target === this) {
            closeViewNoteModal();
        }
    });
});


async function summarizeText(method) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString()
        });

        if (!result) {
            alert('Please select some text on the page to summarize.');
            return;
        }
        // const opt = method == 'summarize' ? 'summarize' : 'suggest';
        const response = await fetch('http://localhost:8080/api/research/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: result, operation: method })
        });

        if (!response.ok) {
            alert('Failed to fetch summary from the server.');
            throw new Error('Network response was not ok');
        }

        const text = await response.text();
        showresult(text.replace(/\n/g, '<br/>'));
    }
    catch (error) {
        alert('An error occurred while summarizing the text.');
        console.error('Error during summarization:', error);
    }
}

function showresult(content) {
    document.getElementById('results').innerHTML = `<div class="result-item"><div class="result-content">${content}</div></div>`;
}

// New functions for notes modal functionality
function openNotesModal() {
    document.getElementById('notesModal').style.display = 'block';
    document.getElementById('noteName').value = '';
    document.getElementById('noteDescription').value = '';
}

function closeNotesModal() {
    document.getElementById('notesModal').style.display = 'none';
}

function saveNewNote() {
    const noteName = document.getElementById('noteName').value.trim();
    const noteDescription = document.getElementById('noteDescription').value.trim();
    if (!noteName) {
        alert('Please enter a note name.');
        return;
    }
    if (!noteDescription) {
        alert('Please enter a note description.');
        return;
    }
    // Get existing notes from storage
    chrome.storage.local.get(['savedNotes'], function (result) {
        let savedNotes = result.savedNotes || [];
        // Create new note object
        const newNote = {
            id: Date.now(),
            name: noteName,
            description: noteDescription,
            timestamp: new Date().toLocaleString()
        };
        // Add new note to the array
        savedNotes.push(newNote);
        // Save back to storage
        chrome.storage.local.set({ savedNotes: savedNotes }, function () {
            alert('Note saved successfully!');
            closeNotesModal();
            loadAndDisplayNotes();
        });
    });
}

// New function to load and display all saved notes
function loadAndDisplayNotes() {
    chrome.storage.local.get(['savedNotes'], function (result) {
        const savedNotes = result.savedNotes || [];
        const notesList = document.getElementById('notesList');
        if (savedNotes.length === 0) {
            notesList.innerHTML = '<div class="no-notes">No notes saved yet. Click "Take Notes" to create your first note.</div>';
            return;
        }
        let notesHtml = '';
        savedNotes.forEach(note => {
            notesHtml += `
                <div class="note-item" data-note-id="${note.id}">
                    <div class="note-info">
                        <div class="note-name">${escapeHtml(note.name)}</div>
                        <div class="note-timestamp">${note.timestamp}</div>
                    </div>
                    <div class="note-actions">
                        <button class="note-btn view-btn" data-action="view" data-note-id="${note.id}">View</button>
                        <button class="note-btn delete-btn" data-action="delete" data-note-id="${note.id}">Delete</button>
                    </div>
                </div>
            `;
        });

        notesList.innerHTML = notesHtml;

        // Add event listeners to the dynamically created buttons
        addNotesEventListeners();
    });
}

// Function to view a specific note
let currentViewedNoteId = null;

function viewNote(noteId) {
    chrome.storage.local.get(['savedNotes'], function (result) {
        const savedNotes = result.savedNotes || [];
        const note = savedNotes.find(n => n.id === noteId);

        if (note) {
            // Store the current viewed note ID for delete functionality
            currentViewedNoteId = noteId;

            // Populate the view modal with note data
            document.getElementById('viewNoteName').textContent = note.name;
            document.getElementById('viewNoteDescription').textContent = note.description;
            document.getElementById('viewNoteTimestamp').textContent = note.timestamp;

            // Show the view modal
            document.getElementById('viewNoteModal').style.display = 'block';
        }
        else {
            alert('Note not found.');
        }
    });
}

// Function to close the view note modal
function closeViewNoteModal() {
    document.getElementById('viewNoteModal').style.display = 'none';
    currentViewedNoteId = null;
}

// Function to delete the currently viewed note
function deleteCurrentViewedNote() {
    if (currentViewedNoteId && confirm('Are you sure you want to delete this note?')) {
        chrome.storage.local.get(['savedNotes'], function (result) {
            let savedNotes = result.savedNotes || [];
            savedNotes = savedNotes.filter(note => note.id !== currentViewedNoteId);

            chrome.storage.local.set({ savedNotes: savedNotes }, function () {
                alert('Note deleted successfully!');
                // Close the view modal
                closeViewNoteModal();
                // Refresh the notes display
                loadAndDisplayNotes();
            });
        });
    }
}

// Function to delete a specific note
function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        chrome.storage.local.get(['savedNotes'], function (result) {
            let savedNotes = result.savedNotes || [];
            savedNotes = savedNotes.filter(note => note.id !== noteId);

            chrome.storage.local.set({ savedNotes: savedNotes }, function () {
                alert('Note deleted successfully!');
                // Refresh the notes display
                loadAndDisplayNotes();
            });
        });
    }
}

// Helper function to escape HTML characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to add event listeners to note action buttons
function addNotesEventListeners() {
    const noteButtons = document.querySelectorAll('.note-btn');

    noteButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            event.preventDefault();

            const action = this.getAttribute('data-action');
            const noteId = parseInt(this.getAttribute('data-note-id'));

            if (action === 'view') {
                viewNote(noteId);
            } else if (action === 'delete') {
                deleteNote(noteId);
            }
        });
    });
}