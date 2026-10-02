import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabase = createClient(
    "https://hobflhqpndluwvcuyhgp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYmZsaHFwbmRsdXd2Y3V5aGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Njg4MzQsImV4cCI6MjA5NjU0NDgzNH0.4WoHu_iRsYPuLB4HskAhiUUaxBFXNgLtQs1GxztBzj4"
)

const authForm = document.getElementById('auth-form')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const btnRegister = document.getElementById('btn-register')
const messegeDiv = document.getElementById('message')

// Бүртгүүлэх
btnRegister.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()

    if (!email || !password) {
        showMessage('Имэйл болон нууц үгээ бүрэн оруулна уу', 'text-danger')
        return
    }
    if (password.length < 6) {
        showMessage('Нууц үг дор тал нь 6 тэмдэгт байх ёстой', 'text-danger')
        return
    }

    btnRegister.disabled = true
    btnRegister.innerText = 'Бүртгэж байна...'

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
        showMessage(`Бүртгэл амжилтгүй: ${error.message}`, 'text-danger')
        btnRegister.disabled = false
        btnRegister.innerText = 'Шинээр бүртгүүлэх'
    } else {
        showMessage('Бүртгэл амжилттай! Нэвтэрч байна...', 'text-success')
        setTimeout(() => { window.location.href = 'dashboord.html' }, 1500)
    }
})

// Нэвтрэх
authForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = emailInput.value.trim()
    const password = passwordInput.value.trim()

    if (!email || !password) {
        showMessage('Имэйл болон нууц үгээ оруулна уу', 'text-danger')
        return
    }

    const btnLogin = document.getElementById('btn-login')
    btnLogin.disabled = true
    btnLogin.innerText = 'Нэвтэрч байна...'

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        showMessage(`Нэвтрэх амжилтгүй: ${error.message}`, 'text-danger')
        btnLogin.disabled = false
        btnLogin.innerText = 'Нэвтрэх'
    } else {
        window.location.href = 'dashboord.html'
    }
})

function showMessage(text, bootstrapColorClass) {
    messegeDiv.innerText = text
    messegeDiv.className = `text-center small mt-3 fw-medium ${bootstrapColorClass}`
}