import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabase = createClient(
    "https://hobflhqpndluwvcuyhgp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYmZsaHFwbmRsdXd2Y3V5aGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Njg4MzQsImV4cCI6MjA5NjU0NDgzNH0.4WoHu_iRsYPuLB4HskAhiUUaxBFXNgLtQs1GxztBzj4"
)

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = 'index.html'
})

window.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        window.location.href = 'index.html'
        return
    }
    document.getElementById('user-email').innerText = user.email
    fetchTransactions()
})

const transactionForm = document.getElementById('transaction-form')

transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const type = document.getElementById('tx-type').value
    const category = document.getElementById('tx-category').value
    const amount = parseFloat(document.getElementById('tx-amount').value)
    const date = document.getElementById('tx-date').value
    const description = document.getElementById('tx-desc').value

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        alert("Сешн дууссан байна. Дахин нэвтэрнэ үү!")
        window.location.href = 'index.html'
        return
    }

    const { error } = await supabase
        .from('transactions')
        .insert([{ user_id: user.id, type, category, amount, description, date }])
        .select()

    if (error) {
        alert("Гүйлгээг хадгалахад алдаа гарлаа: " + error.message)
    } else {
        alert("Гүйлгээ амжилттай бүртгэгдлээ!")
        transactionForm.reset()
        fetchTransactions()
    }
})

async function fetchTransactions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

    if (error) {
        console.error("Гүйлгээ уншихад алдаа:", error.message)
        return
    }

    renderTransactions(transactions)
    updateCards(transactions)
}

function updateCards(transactions) {
    let income = 0
    let expense = 0
    transactions.forEach(tx => {
        if (tx.type === 'income') income += tx.amount
        else expense += tx.amount
    })
    document.getElementById('total-balance').innerText = (income - expense).toLocaleString() + ' ₮'
    document.getElementById('total-income').innerText = income.toLocaleString() + ' ₮'
    document.getElementById('total-expense').innerText = expense.toLocaleString() + ' ₮'
}

function renderTransactions(transactions) {
    const listContainer = document.getElementById('transaction-list')

    if (transactions.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="fa-solid fa-folder-open fs-3 d-block mb-2"></i>
                    Одоогоор ямар нэгэн гүйлгээ бүртгэгдээгүй байна.
                </td>
            </tr>`
        return
    }

    listContainer.innerHTML = transactions.map(tx => {
        const isIncome = tx.type === 'income'
        const badgeColor = isIncome ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
        const typeText = isIncome ? 'Орлого' : 'Зарлага'
        const amountSign = isIncome ? '+' : '-'
        const amountColor = isIncome ? 'text-success' : 'text-danger'
        return `
            <tr>
                <td>${tx.date}</td>
                <td><span class="badge bg-light text-dark shadow-sm border">${tx.category}</span></td>
                <td class="text-secondary fw-medium">${tx.description}</td>
                <td><span class="badge ${badgeColor}">${typeText}</span></td>
                <td class="text-end fw-bold ${amountColor}">${amountSign}${tx.amount.toLocaleString()} ₮</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-link text-danger p-0" onclick="window.deleteTransaction('${tx.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>`
    }).join('')
}

window.deleteTransaction = async (id) => {
    if (!confirm('Энэ гүйлгээг устгах уу?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
        alert('Устгахад алдаа: ' + error.message)
    } else {
        fetchTransactions()
    }
}