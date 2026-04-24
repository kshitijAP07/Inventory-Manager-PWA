IMAuth.requireAuth(['operator'], '../index.html');

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('task_id');

    if (!taskId) {
        alert("No task selected to reject.");
        window.location.href = 'home.html';
        return;
    }

    document.getElementById('submit-rejection').addEventListener('click', async () => {
        const reason = document.getElementById('rej-reason').value.trim();
        const desc = document.getElementById('rej-desc').value.trim();

        if (!reason || !desc) {
            alert("Please provide both a reason and a description.");
            return;
        }

        // Push the rejection payload to Supabase
        const { error } = await IMData.updateTask(taskId, { 
            status: 'rejected',
            rejection_reason: reason,
            rejection_description: desc 
        });

        if (error) {
            alert('Failed to reject task: ' + error.message);
        } else {
            alert('Task rejected successfully.');
            window.location.href = 'home.html';
        }
    });
});