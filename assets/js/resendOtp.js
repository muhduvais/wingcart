document.addEventListener('DOMContentLoaded', function() {
    const resendBtn = document.getElementById('resend-btn');
    const timerText = document.getElementById('timer-text');
    const timerSpan = document.getElementById('timer');

    let timer = parseInt(sessionStorage.getItem('timer')) || 60;

    const updateTimer = () => {
        sessionStorage.setItem('timer', timer);
        timerSpan.textContent = timer;
    };

    const countdown = setInterval(() => {
        timer--;
        updateTimer();

        if (timer <= 0) {
            clearInterval(countdown);
            sessionStorage.removeItem('timer');
            resendBtn.disabled = false;
            timerText.style.display = 'none';
        }
    }, 1000);

    updateTimer();

    resendBtn.addEventListener('click', () => {
        fetch('/resendOtp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                // Restart the timer
                timer = 60;
                updateTimer();
                resendBtn.disabled = true;
                timerText.style.display = 'block';

                const countdown = setInterval(() => {
                    timer--;
                    updateTimer();

                    if (timer <= 0) {
                        clearInterval(countdown);
                        resendBtn.disabled = false;
                        timerText.style.display = 'none';
                    }
                }, 1000);
            }
        });
    });

    document.querySelector('.editMailBtn').addEventListener('click', () => {
        clearInterval(countdown);
        sessionStorage.removeItem('timer');
    });

});
