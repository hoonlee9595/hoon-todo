// Firebase SDK import
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    onValue, 
    get,
    remove, 
    update
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBB5Pl-P83c5s4I4PZmp3az7Cxyy-o4EZw",
    authDomain: "hoon-todo-backend.firebaseapp.com",
    projectId: "hoon-todo-backend",
    storageBucket: "hoon-todo-backend.firebasestorage.app",
    messagingSenderId: "477258641404",
    appId: "1:477258641404:web:d0bd2fd8f3fc6ac5b60c79",
    databaseURL: "https://hoon-todo-backend-default-rtdb.firebaseio.com/"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const todosRef = ref(database, 'todos');

// 할일 데이터 저장소
let todos = [];
let currentFilter = 'all';

// DOM 요소들
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const todoCount = document.getElementById('todoCount');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');

// Realtime Database에서 할일 목록 한 번만 가져오기
async function fetchTodos() {
    try {
        const snapshot = await get(todosRef);
        const data = snapshot.val();
        
        if (data) {
            // Realtime Database는 객체 형태로 데이터를 반환하므로 배열로 변환
            todos = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            todos = [];
        }
        
        renderTodos();
        console.log('할일 목록을 성공적으로 가져왔습니다:', todos);
        return todos;
    } catch (error) {
        console.error('할일 불러오기 실패:', error);
        alert('할일을 불러오는 중 오류가 발생했습니다.');
        return [];
    }
}

// Realtime Database에서 할일 불러오기 및 실시간 리스너 설정
function loadTodos() {
    try {
        // 먼저 한 번 가져오기
        fetchTodos();
        
        // 실시간 업데이트 리스너 설정
        onValue(todosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Realtime Database는 객체 형태로 데이터를 반환하므로 배열로 변환
                todos = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
            } else {
                todos = [];
            }
            renderTodos();
        }, (error) => {
            console.error('실시간 할일 불러오기 실패:', error);
            alert('할일을 불러오는 중 오류가 발생했습니다.');
        });
    } catch (error) {
        console.error('할일 불러오기 실패:', error);
        alert('할일을 불러오는 중 오류가 발생했습니다.');
    }
}

// 할일 추가
async function addTodo() {
    const text = todoInput.value.trim();
    if (text === '') {
        alert('할일을 입력해주세요!');
        return;
    }

    try {
        const newTodo = {
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        // Realtime Database에 추가 (push는 자동으로 고유 키 생성)
        await push(todosRef, newTodo);
        todoInput.value = '';
        todoInput.focus();
        // loadTodos()의 실시간 리스너가 자동으로 업데이트함
    } catch (error) {
        console.error('할일 추가 실패:', error);
        alert('할일 추가 중 오류가 발생했습니다.');
    }
}

// 할일 삭제 - Firebase Realtime Database 사용
async function deleteTodo(id) {
    if (!id) {
        console.error('삭제할 할일 ID가 없습니다.');
        return;
    }

    if (confirm('정말 삭제하시겠습니까?')) {
        try {
            const todoRef = ref(database, `todos/${id}`);
            await remove(todoRef);
            console.log(`할일(ID: ${id})이 성공적으로 삭제되었습니다.`);
            // loadTodos()의 실시간 리스너가 자동으로 업데이트함
        } catch (error) {
            console.error('할일 삭제 실패:', error);
            alert(`할일 삭제 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}

// 할일 완료 상태 토글
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        try {
            const todoRef = ref(database, `todos/${id}`);
            await update(todoRef, {
                completed: !todo.completed
            });
            // loadTodos()의 실시간 리스너가 자동으로 업데이트함
        } catch (error) {
            console.error('할일 상태 변경 실패:', error);
            alert('할일 상태 변경 중 오류가 발생했습니다.');
        }
    }
}

// 할일 수정 - Firebase Realtime Database 사용
function editTodo(id) {
    if (!id) {
        console.error('수정할 할일 ID가 없습니다.');
        return;
    }

    const todo = todos.find(t => t.id === id);
    if (!todo) {
        console.error(`할일(ID: ${id})을 찾을 수 없습니다.`);
        alert('수정할 할일을 찾을 수 없습니다.');
        return;
    }

    const todoItem = document.querySelector(`[data-id="${id}"]`);
    if (!todoItem) {
        console.error(`할일 요소(ID: ${id})를 찾을 수 없습니다.`);
        return;
    }

    const todoText = todoItem.querySelector('.todo-text');
    if (!todoText) {
        console.error('할일 텍스트 요소를 찾을 수 없습니다.');
        return;
    }

    const editButton = todoItem.querySelector('.btn-edit');
    if (!editButton) {
        console.error('수정 버튼을 찾을 수 없습니다.');
        return;
    }

    const currentText = todo.text;

    // 이미 편집 중이면 중복 방지
    if (todoText.classList.contains('editing')) {
        return;
    }

    // 수정 버튼을 저장 버튼으로 변경
    editButton.textContent = '저장';
    editButton.onclick = null; // 기존 이벤트 제거

    // 편집 모드로 전환
    todoText.contentEditable = true;
    todoText.classList.add('editing');
    todoText.focus();

    // 텍스트 선택
    const range = document.createRange();
    range.selectNodeContents(todoText);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // 저장 함수 - Firebase Realtime Database에 업데이트
    const saveEdit = async () => {
        const newText = todoText.textContent.trim();
        
        // 편집 모드 해제
        todoText.contentEditable = false;
        todoText.classList.remove('editing');
        
        // 저장 버튼을 다시 수정 버튼으로 변경
        editButton.textContent = '수정';
        editButton.removeEventListener('click', handleSaveClick);
        editButton.onclick = () => window.editTodo(id);
        
        // 이벤트 리스너 제거 (중복 방지)
        todoText.removeEventListener('keydown', handleKeyDown);
        todoText.removeEventListener('blur', saveEdit);

        if (newText === '') {
            alert('할일 내용을 입력해주세요!');
            todoText.textContent = currentText;
            return;
        }

        if (newText === currentText) {
            // 변경사항이 없으면 그냥 종료
            return;
        }

        try {
            const todoRef = ref(database, `todos/${id}`);
            await update(todoRef, {
                text: newText,
                updatedAt: new Date().toISOString() // 수정 시간 추가
            });
            console.log(`할일(ID: ${id})이 성공적으로 수정되었습니다.`);
            // loadTodos()의 실시간 리스너가 자동으로 업데이트함
        } catch (error) {
            console.error('할일 수정 실패:', error);
            alert(`할일 수정 중 오류가 발생했습니다: ${error.message}`);
            todoText.textContent = currentText;
        }
    };

    // 저장 버튼 클릭 핸들러 (saveEdit 위에 정의)
    const handleSaveClick = (e) => {
        e.stopPropagation();
        saveEdit();
    };

    // 저장 버튼 클릭 이벤트 추가
    editButton.addEventListener('click', handleSaveClick);

    // 키보드 이벤트 핸들러
    const handleKeyDown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        }
        if (e.key === 'Escape') {
            todoText.textContent = currentText;
            todoText.contentEditable = false;
            todoText.classList.remove('editing');
            // 저장 버튼을 다시 수정 버튼으로 변경
            editButton.textContent = '수정';
            editButton.removeEventListener('click', handleSaveClick);
            editButton.onclick = () => window.editTodo(id);
            todoText.removeEventListener('keydown', handleKeyDown);
            todoText.removeEventListener('blur', saveEdit);
        }
    };

    // Enter 키로 저장, Esc 키로 취소
    todoText.addEventListener('keydown', handleKeyDown);

    // 포커스 아웃 시 저장
    todoText.addEventListener('blur', saveEdit);
}

// 필터링된 할일 목록 가져오기
function getFilteredTodos() {
    switch (currentFilter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        default:
            return todos;
    }
}

// 할일 목록 렌더링
function renderTodos() {
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        const emptyMessage = currentFilter === 'all' 
            ? '할일이 없습니다. 새로운 할일을 추가해보세요!' 
            : currentFilter === 'active'
            ? '진행중인 할일이 없습니다.'
            : '완료된 할일이 없습니다.';
        todoList.innerHTML = `<li class="empty-state">${emptyMessage}</li>`;
    } else {
        todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <input 
                    type="checkbox" 
                    class="todo-checkbox" 
                    ${todo.completed ? 'checked' : ''}
                    onchange="window.toggleTodo('${todo.id}')"
                >
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <div class="todo-actions">
                    <button class="btn-edit" onclick="window.editTodo('${todo.id}')">수정</button>
                    <button class="btn-delete" onclick="window.deleteTodo('${todo.id}')">삭제</button>
                </div>
            </li>
        `).join('');
    }

    // 통계 업데이트
    const activeCount = todos.filter(todo => !todo.completed).length;
    todoCount.textContent = `${activeCount}개의 할일`;
}

// HTML 이스케이프 함수 (XSS 방지)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 완료된 항목 모두 삭제 - Firebase Realtime Database 사용
async function clearCompletedTodos() {
    const completedTodos = todos.filter(todo => todo.completed);
    const completedCount = completedTodos.length;
    
    if (completedCount === 0) {
        alert('완료된 할일이 없습니다.');
        return;
    }
    
    if (confirm(`완료된 ${completedCount}개의 할일을 모두 삭제하시겠습니까?`)) {
        try {
            const deletePromises = completedTodos.map(todo => {
                const todoRef = ref(database, `todos/${todo.id}`);
                return remove(todoRef);
            });
            await Promise.all(deletePromises);
            console.log(`${completedCount}개의 완료된 할일이 성공적으로 삭제되었습니다.`);
            // loadTodos()의 실시간 리스너가 자동으로 업데이트함
        } catch (error) {
            console.error('완료된 할일 삭제 실패:', error);
            alert(`완료된 할일 삭제 중 오류가 발생했습니다: ${error.message}`);
        }
    }
}

// 필터 변경
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderTodos();
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

clearCompleted.addEventListener('click', clearCompletedTodos);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// 전역 함수로 노출 (HTML onclick에서 사용)
window.toggleTodo = toggleTodo;
window.editTodo = editTodo;
window.deleteTodo = deleteTodo;
window.fetchTodos = fetchTodos; // 할일 목록 가져오기 함수

// 앱 초기화
loadTodos();
