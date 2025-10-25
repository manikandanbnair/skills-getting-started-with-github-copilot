document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to avoid HTML injection from participant emails
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
  const response = await fetch("/activities", { cache: 'no-store' });
      const activities = await response.json();

      // Clear loading message and reset list + select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participants-list">
              <!-- participants will be populated by DOM to attach delete handlers -->
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Populate participants list using DOM so we can attach delete handlers safely
        const participantsListEl = activityCard.querySelector('.participants-list');
        participantsListEl.innerHTML = '';

        if (Array.isArray(details.participants) && details.participants.length) {
          details.participants.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.className = 'participant-email';
            span.textContent = p; // textContent is safe

            const btn = document.createElement('button');
            btn.className = 'participant-delete';
            btn.title = 'Unregister participant';
            btn.type = 'button';
            btn.textContent = '✕';
            // store raw values in dataset for use when calling the API
            btn.dataset.activity = name;
            btn.dataset.email = p;

            btn.addEventListener('click', async (e) => {
              // Disable while processing
              btn.disabled = true;
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: 'DELETE' }
                );

                const result = await resp.json().catch(() => ({}));

                if (resp.ok) {
                  messageDiv.textContent = result.message || 'Participant removed';
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  // Refresh activities so UI updates
                  await fetchActivities();
                } else {
                  messageDiv.textContent = result.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
                // Hide after a few seconds
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              } catch (err) {
                console.error('Error removing participant:', err);
                messageDiv.textContent = 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              } finally {
                btn.disabled = false;
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            participantsListEl.appendChild(li);
          });
        } else {
          const li = document.createElement('li');
          li.className = 'participant-item empty';
          li.textContent = 'No participants yet';
          participantsListEl.appendChild(li);
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      
      return activities;
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so participants list updates immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
