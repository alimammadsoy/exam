// JS
document.addEventListener('DOMContentLoaded', function () {
    let questions = [];
    let selectedQuestions = [];
    let currentQuestionIndex = 0;
    let userAnswers = new Array(50).fill(null);
    let markedForReview = new Array(50).fill(false);
    let examStarted = false;
    let timerInterval = null;
    let timeLeft = 120 * 60;
    let currentExam = null;  // Seçili sınavı saklayacağız
    let exams = [];  // Tüm sınavları saklayacağız
    let correctAnswerShown = false;  // Doğru cevap gösterilip gösterilmediğini takip et
    
    // Her soru için karıştırılmış seçenek indekslerini saklayacağız
    let shuffledOptions = new Array(50).fill(null).map(() => []);

    // DOM elementleri
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const questionButtons = document.getElementById('question-buttons');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const markReviewBtn = document.getElementById('mark-review');
    const showAnswerBtn = document.getElementById('show-answer-btn');
    const timer = document.getElementById('timer');
    const finishExamBtn = document.getElementById('finish-exam');
    const resultModal = document.getElementById('result-modal');
    const modalCorrect = document.getElementById('modal-correct');
    const modalWrong = document.getElementById('modal-wrong');
    const modalUnanswered = document.getElementById('modal-unanswered');
    const modalScore = document.getElementById('modal-score');
    const closeModal = document.getElementById('close-modal');
    const restartExamBtn = document.getElementById('restart-exam');

    // Modal için DOM
    const rangeModal = document.getElementById('range-modal');
    const rangeStartInput = document.getElementById('range-start');
    const rangeEndInput = document.getElementById('range-end');
    const confirmRangeBtn = document.getElementById('confirm-range');
    const tabRangeBtn = document.getElementById('tab-range');
    const tabNumbersBtn = document.getElementById('tab-numbers');
    const rangePanel = document.getElementById('range-panel');
    const numbersPanel = document.getElementById('numbers-panel');
    const questionNumbersInput = document.getElementById('question-numbers');
    const errorMessage = document.getElementById('error-message');
    const examSelect = document.getElementById('exam-select');
    const startExamBtn = document.getElementById('start-exam-btn');

    // İstatistik elementleri
    const correctCountElement = document.getElementById('correct-count');
    const wrongCountElement = document.getElementById('wrong-count');
    const unansweredCountElement = document.getElementById('unanswered-count');
    const totalQuestionsElement = document.getElementById('total-questions');
    const answeredQuestionsElement = document.getElementById('answered-questions');
    const remainingQuestionsElement = document.getElementById('remaining-questions');

    // Sınavları yükle
    fetch('exams.json')
        .then(r => r.ok ? r.json() : Promise.reject('İmtahanlar yüklənmədi'))
        .then(data => {
            exams = data;
            populateExamSelect();
        })
        .catch(() => {
            exams = [{
                id: 1,
                name: "Demo Sınav",
                csvFile: "questions-v1.csv",
                questionCount: 250
            }];
            populateExamSelect();
        });

    // Select'i doldur
    function populateExamSelect() {
        examSelect.innerHTML = '<option value="">İmtahan seçin...</option>';
        exams.forEach(exam => {
            const option = document.createElement('option');
            option.value = exam.id;
            option.textContent = exam.name;
            examSelect.appendChild(option);
        });
    }

    // İmtahana başla butonuna tıkla
    startExamBtn.addEventListener('click', () => {
        errorMessage.classList.add('hidden');
        
        // Form alanlarını reset et
        examSelect.value = '';
        rangeStartInput.value = 1;
        rangeEndInput.value = 250;
        questionNumbersInput.value = '';
        currentExam = null;
        
        // Tab'ları default durumuna getir (Aralıq sekmesi aktif)
        rangePanel.classList.remove('hidden');
        numbersPanel.classList.add('hidden');
        tabRangeBtn.classList.add('bg-blue-500', 'text-white');
        tabRangeBtn.classList.remove('bg-gray-300', 'text-gray-700');
        tabNumbersBtn.classList.add('bg-gray-300', 'text-gray-700');
        tabNumbersBtn.classList.remove('bg-blue-500', 'text-white');
        
        rangeModal.classList.remove('hidden');
    });

    // Modal event listener'larını ekle
    attachModalEventListeners();

    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const questions = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseCSVLine(lines[i]);
            if (values.length >= 8) {
                questions.push({
                    id: parseInt(values[0]) || i,
                    text: values[1],
                    options: [values[2], values[3], values[4], values[5], values[6]],
                    correct_answer: convertAnswerToIndex(values[7]),
                    category: 'Ümumi'
                });
            }
        }
        return questions;
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '', inQuotes = false;
        for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
            else current += char;
        }
        result.push(current.trim());
        return result;
    }

    function convertAnswerToIndex(answer) {
        const map = { a: 0, b: 1, c: 2, d: 3, e: 4, A: 0, B: 1, C: 2, D: 3, E: 4 };
        return map[answer.trim()] ?? 0;
    }

    function loadDemoQuestionsFromCSV() {
        const demoCSV = `question_id,question_text,option_a,option_b,option_c,option_d,option_e,correct_answer_id
1,Informasiya nedir?,Yalnız reqəmlər ve statistikalar,Kompüter yaddaşındaki bütün fayllar,Program teminatı,Şebeke avadanlığı,Malumatın insan, sistem ve ya teşkilat üçün faydalı mezmunu,e
2,Informasiya tehļūkesizliyinin esas maqsədi nədir?,Sistemlerin süretini artırmaq,Yeni program teminatı yazmaq,Şebakani genişlandirmak,Faylları sıxmaq,Malumatın mәxfilik, bütövlük ve mövcudluğunu təmin etmek,e`;
        questions = parseCSV(demoCSV);
        while (questions.length < 250) questions = questions.concat(questions);
        questions = questions.slice(0, 250);
    }

    // Event listener'ları sadece bir kez ekle
    function attachModalEventListeners() {
        // Sınav seçilmişse input'ları güncelle
        examSelect.addEventListener('change', function handleExamChange() {
            const selectedExamId = parseInt(examSelect.value);
            currentExam = exams.find(e => e.id === selectedExamId);
            
            if (currentExam) {
                // CSV dosyasını yükle
                loadExamCSV(currentExam.csvFile);
                
                // Max değerleri currentExam.questionCount'a göre ayarla
                rangeEndInput.max = currentExam.questionCount;
                rangeEndInput.value = currentExam.questionCount;
                rangeStartInput.max = currentExam.questionCount;
                rangeStartInput.value = 1;
                
                errorMessage.classList.add('hidden');
            }
        });
        
        // Tab değiştirme işlevselliği - Aralıq Sekmesi
        tabRangeBtn.addEventListener('click', function handleTabRange() {
            rangePanel.classList.remove('hidden');
            numbersPanel.classList.add('hidden');
            tabRangeBtn.classList.add('bg-blue-500', 'text-white');
            tabRangeBtn.classList.remove('bg-gray-300', 'text-gray-700');
            tabNumbersBtn.classList.add('bg-gray-300', 'text-gray-700');
            tabNumbersBtn.classList.remove('bg-blue-500', 'text-white');
            errorMessage.classList.add('hidden');
        });
        
        // Tab değiştirme işlevselliği - Sual Nömrələri Sekmesi
        tabNumbersBtn.addEventListener('click', function handleTabNumbers() {
            rangePanel.classList.add('hidden');
            numbersPanel.classList.remove('hidden');
            tabNumbersBtn.classList.add('bg-blue-500', 'text-white');
            tabNumbersBtn.classList.remove('bg-gray-300', 'text-gray-700');
            tabRangeBtn.classList.add('bg-gray-300', 'text-gray-700');
            tabRangeBtn.classList.remove('bg-blue-500', 'text-white');
            errorMessage.classList.add('hidden');
        });
        
        // İmtahana başla butonu (modal içinde)
        confirmRangeBtn.addEventListener('click', function handleConfirmRange() {
            // Sınav seçilmiş mi kontrol et
            if (!currentExam) {
                showError('Zəhmət olmasa bir imtahan seçin');
                return;
            }
            
            // Hangi tab seçili olduğunu kontrol et
            if (!rangePanel.classList.contains('hidden')) {
                // Aralıq seçim modu
                let start = parseInt(rangeStartInput.value);
                let end = parseInt(rangeEndInput.value);

                if (isNaN(start) || isNaN(end) || start < 1 || end > currentExam.questionCount || start > end) {
                    showError(`Zəhmət olmasa düzgün bir aralıq daxil edin (1-${currentExam.questionCount})`);
                    return;
                }
                
                const rangeQuestions = questions.slice(start - 1, end);
                if (rangeQuestions.length === 0) {
                    showError('Bu aralıqta sual tapılmadı');
                    return;
                }
                
                // Seçilen soruları al ve 50 soruluk dizi oluştur
                selectedQuestions = getRandomQuestionsWithRepeat(rangeQuestions, 50);
            } else {
                // Soru numarası seçim modu
                const input = questionNumbersInput.value.trim();
                if (!input) {
                    showError('Zəhmət olmasa sual nömrələri daxil edin');
                    return;
                }
                
                const questionIndices = parseQuestionNumbers(input);
                if (questionIndices.length === 0) {
                    showError('Sual nömrələrinin formatı düzgün deyil. Nümunə: 1,5-10,15,20-25');
                    return;
                }
                
                // Soru numaralarının geçerli olup olmadığını kontrol et
                const invalidNumbers = questionIndices.filter(idx => idx < 1 || idx > currentExam.questionCount);
                if (invalidNumbers.length > 0) {
                    showError(`Uyğun olmayan sual nömrələri: ${invalidNumbers.join(', ')} (1-${currentExam.questionCount} aralığında olmalıdır)`);
                    return;
                }
                
                // Seçilen soru indekslerine göre soruları al
                const selectedQuestionsList = [];
                questionIndices.forEach(idx => {
                    if (idx >= 1 && idx <= questions.length) {
                        selectedQuestionsList.push(questions[idx - 1]);
                    }
                });
                
                if (selectedQuestionsList.length === 0) {
                    showError('Uyğun sual nömrəsi tapılmadı');
                    return;
                }
                
                // 50 soruluk dizi oluştur (tekrar eden sorular ile)
                selectedQuestions = getRandomQuestionsWithRepeat(selectedQuestionsList, 50);
            }
            
            // Seçenekleri karıştır
            selectedQuestions.forEach((question, index) => {
                shuffledOptions[index] = shuffleOptions(question.options, question.correct_answer);
            });
            
            rangeModal.classList.add('hidden');
            initializeExam();
        });
    }

    function showRangeModal() {
        rangeModal.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    
    // Seçili sınavın CSV dosyasını yükle
    function loadExamCSV(csvFile) {
        fetch(csvFile)
            .then(r => r.ok ? r.text() : Promise.reject('CSV faylı yüklənmədi'))
            .then(text => {
                questions = parseCSV(text);
            })
            .catch(error => {
                console.error('CSV yükləmə xətası:', error);
                loadDemoQuestionsFromCSV();
            });
    }
    
    // Soru numaralarını parse et: "1,5-10,15,20-25,30" formatı
    function parseQuestionNumbers(input) {
        const result = [];
        const parts = input.split(',');
        
        for (let part of parts) {
            part = part.trim();
            
            if (part.includes('-')) {
                // Aralıq: 5-10
                const [start, end] = part.split('-').map(x => parseInt(x.trim()));
                
                if (isNaN(start) || isNaN(end) || start > end) {
                    return []; // Hata
                }
                
                for (let i = start; i <= end; i++) {
                    result.push(i);
                }
            } else {
                // Tek sayı
                const num = parseInt(part);
                if (isNaN(num)) {
                    return []; // Hata
                }
                result.push(num);
            }
        }
        
        return result;
    }
    
    // Soruları tekrar tekrar kullanarak 50 soru oluştur
    function getRandomQuestionsWithRepeat(arr, count) {
        if (arr.length === 0) return [];
        
        const result = [];
        while (result.length < count) {
            const randomIndex = Math.floor(Math.random() * arr.length);
            result.push(arr[randomIndex]);
        }
        
        return result;
    }

    function getRandomQuestions(arr, count) {
        return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
    }
    function shuffleOptions(options, correctIndex) {
        // Orijinal seçeneklerin indekslerini oluştur
        const indices = options.map((_, index) => index);
        
        // Fisher-Yates shuffle algoritması
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        // Yeni düzeni ve doğru cevabın yeni indeksini sakla
        const shuffled = {
            indices: indices,
            originalToShuffled: {},
            shuffledToOriginal: {},
            correctIndexInShuffled: indices.indexOf(correctIndex)
        };
        
        // Mapping'leri oluştur
        indices.forEach((originalIdx, shuffledIdx) => {
            shuffled.originalToShuffled[originalIdx] = shuffledIdx;
            shuffled.shuffledToOriginal[shuffledIdx] = originalIdx;
        });
        
        return shuffled;
    }

    function initializeExam() {
        examStarted = true;
        createQuestionButtons();
        showQuestion(currentQuestionIndex);
        updateStats();
        updateSidebarStats();
        startTimer();
    }

    function createQuestionButtons() {
        questionButtons.innerHTML = '';
        selectedQuestions.forEach((q, i) => {
            const btn = document.createElement('button');
            btn.className = 'question-btn w-10 h-10 border border-gray-300 rounded flex items-center justify-center text-sm font-medium';
            btn.textContent = i + 1;
            btn.dataset.index = i;
            btn.addEventListener('click', () => goToQuestion(i));
            questionButtons.appendChild(btn);
        });
    }

    function showQuestion(index) {
        if (index < 0 || index >= selectedQuestions.length) return;

        // Yeni soru seçiliyorsa doğru cevab gösterim durumunu sıfırla
        if (currentQuestionIndex !== index) {
            correctAnswerShown = false;
            updateShowAnswerButton();
        }

        // Önceki aktif butonun durumunu güncelle
        const prevActiveBtn = document.querySelector('.question-btn[data-index="' + currentQuestionIndex + '"]');
        if (prevActiveBtn) {
            let prevStatus = getQuestionStatus(currentQuestionIndex);
            updateQuestionButton(currentQuestionIndex, prevStatus);
        }

        currentQuestionIndex = index;
        const question = selectedQuestions[index];
        const shuffleInfo = shuffledOptions[index];

        // Soru metnini güncelle
        document.getElementById('current-question-number').textContent = index + 1;
        questionText.textContent = question.text;

        // Seçenekleri oluştur (karıştırılmış şekilde)
        optionsContainer.innerHTML = '';
        
        // Karıştırılmış indekslere göre seçenekleri göster
        shuffleInfo.indices.forEach((originalIndex, shuffledPosition) => {
            const option = question.options[originalIndex];
            if (!option) return;

            const optionElement = document.createElement('div');
            optionElement.className = 'option-item flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50';

            const radioId = `option-${index}-${shuffledPosition}`;
            optionElement.innerHTML = `
            <input type="radio" id="${radioId}" name="question-${index}" value="${shuffledPosition}" class="hidden">
            <div class="custom-radio w-6 h-6 rounded-full border-2 border-gray-400 mr-4 flex items-center justify-center"></div>
            <label for="${radioId}" class="flex-1 cursor-pointer text-gray-800">${option}</label>
        `;

            // Eğer bu seçenek seçilmişse işaretle
            if (userAnswers[index] === shuffledPosition) {
                optionElement.classList.add('bg-blue-50', 'border-blue-300');
                optionElement.querySelector('.custom-radio').innerHTML = '<div class="w-3 h-3 rounded-full bg-blue-600"></div>';
            }

            // Sınav bittiyse veya doğru cevap gösteriliyorsa renkler göster
            if (!examStarted || correctAnswerShown) {
                const correctShuffledIndex = shuffleInfo.correctIndexInShuffled;
                if (shuffledPosition === correctShuffledIndex) {
                    optionElement.classList.add('bg-green-100', 'border-green-400');
                    optionElement.querySelector('.custom-radio').innerHTML = '<div class="w-3 h-3 rounded-full bg-green-600"></div>';
                }
                if (userAnswers[index] === shuffledPosition && userAnswers[index] !== correctShuffledIndex) {
                    optionElement.classList.add('bg-red-100', 'border-red-400');
                    optionElement.querySelector('.custom-radio').innerHTML = '<div class="w-3 h-3 rounded-full bg-red-600"></div>';
                }
                if (!examStarted) {
                    optionElement.style.pointerEvents = 'none';
                }
            }

            optionElement.addEventListener('click', (e) => {
                if (!examStarted) return;

                // Tüm seçenekleri temizle
                document.querySelectorAll('.option-item').forEach(item => {
                    item.classList.remove('bg-blue-50', 'border-blue-300');
                    item.querySelector('.custom-radio').innerHTML = '';
                });

                // Seçili seçeneği işaretle
                optionElement.classList.add('bg-blue-50', 'border-blue-300');
                optionElement.querySelector('.custom-radio').innerHTML = '<div class="w-3 h-3 rounded-full bg-blue-600"></div>';

                // Kullanıcı cevabını kaydet (karıştırılmış indeksi kaydet)
                userAnswers[index] = shuffledPosition;

                // Soru butonunu güncelle
                updateQuestionButton(index, getQuestionStatus(index));

                // İstatistikleri güncelle
                updateStats();
                updateSidebarStats();
            });

            optionsContainer.appendChild(optionElement);
        });

        // İlerleme çubuğunu güncelle
        const progressPercent = ((index + 1) / selectedQuestions.length) * 100;
        document.getElementById('progress-bar').style.width = `${progressPercent}%`;

        // Buton durumlarını güncelle
        prevBtn.disabled = index === 0;

        // Son soruda "Növbəti" butonunu "İmtahanı Bitir" yap
        if (index === selectedQuestions.length - 1) {
            nextBtn.innerHTML = 'İmtahanı Bitir <i class="fas fa-flag ml-2"></i>';
            nextBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            nextBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        } else {
            nextBtn.innerHTML = 'Növbəti <i class="fas fa-arrow-right ml-2"></i>';
            nextBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
            nextBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }

        // Nəzərdən Keçir butonunu güncelle
        updateMarkReviewButton();

        // Aktif soru butonunu güncelle
        updateQuestionButton(index, 'active');
    }

    function getQuestionStatus(index) {
        if (index < 0 || index >= selectedQuestions.length) return 'default';

        // Gözden geçirme işaretli mi?
        if (markedForReview[index]) {
            return 'review';
        }

        // Sınav devam ediyorsa
        if (examStarted) {
            if (userAnswers[index] !== null) return 'answered';
            return 'default';
        }

        // Sınav bittiyse
        if (userAnswers[index] === null) return 'unanswered';

        // Doğru cevabı karıştırılmış indekse göre kontrol et
        const correctShuffledIndex = shuffledOptions[index].correctIndexInShuffled;
        return userAnswers[index] === correctShuffledIndex ? 'correct' : 'wrong';
    }

    function updateQuestionButton(index, status) {
        const btn = document.querySelector(`.question-btn[data-index="${index}"]`);
        if (!btn) return;

        // Tüm durum sınıflarını kaldır
        btn.className = 'question-btn w-10 h-10 rounded flex items-center justify-center text-sm font-medium transition-all duration-200';

        // Temel sınıfları ekle
        btn.classList.add('border');

        // Duruma göre sınıfları ekle
        switch (status) {
            case 'active':
                btn.classList.add('border-2', 'border-blue-500', 'font-bold', 'bg-blue-50');
                break;
            case 'correct':
                btn.classList.add('bg-green-500', 'text-white', 'border-green-500');
                break;
            case 'wrong':
                btn.classList.add('bg-red-500', 'text-white', 'border-red-500');
                break;
            case 'review':
                btn.classList.add('bg-yellow-500', 'border-yellow-600', 'border-2', 'text-white');
                break;
            case 'answered':
                if (markedForReview[index]) {
                    btn.classList.add('bg-yellow-500', 'text-white', 'border-yellow-600', 'border-2');
                } else {
                    btn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
                }
                break;
            case 'unanswered':
                if (markedForReview[index]) {
                    btn.classList.add('bg-yellow-500', 'text-white', 'border-yellow-600', 'border-2');
                } else {
                    btn.classList.add('border-gray-300', 'bg-white');
                }
                break;
            default:
                if (markedForReview[index]) {
                    btn.classList.add('bg-yellow-500', 'text-white', 'border-yellow-600', 'border-2');
                } else {
                    btn.classList.add('border-gray-300', 'bg-white');
                }
        }
    }

    // Nəzərdən Keçir butonunu güncelle
    function updateMarkReviewButton() {
        if (markedForReview[currentQuestionIndex]) {
            markReviewBtn.innerHTML = '<i class="fas fa-bookmark mr-2"></i>Nəzərdən Keçirdən Çıxar';
            markReviewBtn.classList.remove('bg-yellow-100', 'hover:bg-yellow-200', 'text-yellow-800');
            markReviewBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'text-white');
        } else {
            markReviewBtn.innerHTML = '<i class="fas fa-bookmark mr-2"></i>Nəzərdən Keçir';
            markReviewBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600', 'text-white');
            markReviewBtn.classList.add('bg-yellow-100', 'hover:bg-yellow-200', 'text-yellow-800');
        }
    }

    // Nəzərdən Keçir butonu işlevi
    function toggleMarkForReview() {
        if (!examStarted) return;

        markedForReview[currentQuestionIndex] = !markedForReview[currentQuestionIndex];

        // Soru butonunu güncelle
        updateQuestionButton(currentQuestionIndex, getQuestionStatus(currentQuestionIndex));

        // Nəzərdən Keçir butonunu güncelle
        updateMarkReviewButton();
    }

    // Doğru cevabı göster/gizle işlevi
    function toggleShowAnswer() {
        if (!examStarted) return;

        correctAnswerShown = !correctAnswerShown;
        updateShowAnswerButton();

        // Soruyu tekrar göster (doğru cevap gösterilsin veya gizlensin)
        showQuestion(currentQuestionIndex);
    }

    // Doğru cevabı göster butonunu güncelle
    function updateShowAnswerButton() {
        if (!showAnswerBtn) return;
        
        if (correctAnswerShown) {
            showAnswerBtn.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Doğru cavabı gizlət';
        } else {
            showAnswerBtn.innerHTML = '<i class="fas fa-lightbulb mr-2"></i>Düzgün cavabı göstər';
        }
    }

    function updateStats() {
        let answered = 0;
        userAnswers.forEach(a => { if (a !== null) answered++; });
        const remaining = selectedQuestions.length - answered;
        document.getElementById('answered-questions').textContent = answered;
        document.getElementById('remaining-questions').textContent = remaining;
    }

    function updateSidebarStats() {
        let answered = 0;
        let unanswered = 0;

        // Cevaplanan ve cevaplanmayan soruları say
        userAnswers.forEach(answer => {
            if (answer === null) {
                unanswered++;
            } else {
                answered++;
            }
        });

        // Toplam soru sayısını güncelle
        totalQuestionsElement.textContent = selectedQuestions.length;

        // Cevap verilen sayısı
        answeredQuestionsElement.textContent = answered;
        remainingQuestionsElement.textContent = unanswered;

        // Sınav devam ediyorsa
        if (examStarted) {
            // Doğru ve yanlış sayılarını gizle
            correctCountElement.textContent = "-";
            wrongCountElement.textContent = "-";
            unansweredCountElement.textContent = unanswered;
        }
        // Sınav bittiyse
        else {
            let correct = 0;
            let wrong = 0;
            unanswered = 0; // Sıfırla ve yeniden hesapla

            // Doğru ve yanlış sayılarını hesapla
            userAnswers.forEach((answer, index) => {
                const correctShuffledIndex = shuffledOptions[index].correctIndexInShuffled;
                if (answer === null) {
                    unanswered++;
                } else if (answer === correctShuffledIndex) {
                    correct++;
                } else {
                    wrong++;
                }
            });

            // Güncelle
            correctCountElement.textContent = correct;
            wrongCountElement.textContent = wrong;
            unansweredCountElement.textContent = unanswered;

            // Cevaplanan sayısını da güncelle
            answeredQuestionsElement.textContent = selectedQuestions.length - unanswered;
            remainingQuestionsElement.textContent = unanswered;
        }
    }

    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) { clearInterval(timerInterval); finishExam(); }
        }, 1000);
    }

    function updateTimerDisplay() {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timer.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (timeLeft <= 300) { timer.classList.add('text-red-600'); timer.classList.remove('text-gray-800'); }
    }

    function goToQuestion(index) {
        if (index >= 0 && index < selectedQuestions.length) {
            showQuestion(index);
        }
    }

    function showResults() {
        clearInterval(timerInterval);
        
        let correct = 0, wrong = 0, unanswered = 0;
        
        // Tüm soruların durumunu güncelle
        userAnswers.forEach((answer, i) => {
            const correctShuffledIndex = shuffledOptions[i].correctIndexInShuffled;
            let status;
            
            if (answer === null) {
                unanswered++;
                status = 'unanswered';
            } else if (answer === correctShuffledIndex) {
                correct++;
                status = 'correct';
            } else {
                wrong++;
                status = 'wrong';
            }
            
            // Eğer soru işaretlenmişse ve sınav bittiyse, öncelik doğru/yanlış olsun
            if (markedForReview[i] && examStarted) {
                status = 'review';
            }
            
            updateQuestionButton(i, status);
        });
        
        const score = Math.round((correct / selectedQuestions.length) * 100);
        modalCorrect.textContent = correct;
        modalWrong.textContent = wrong;
        modalUnanswered.textContent = unanswered;
        modalScore.textContent = `${score}%`;
        
        // Sınavı bitir ve istatistikleri göster
        examStarted = false;
        
        // Yan menü istatistiklerini güncelle (artık doğru/yanlış gösterilecek)
        updateSidebarStats();
        
        // Sonuç modalını göster
        resultModal.classList.remove('hidden');
        
        // Mevcut soruyu tekrar göster (doğru/yanlış renklendirmesi için)
        showQuestion(currentQuestionIndex);
    }

    function finishExam() {
        if (examStarted) {
            if (confirm('İmtahanı bitirmək istədiyinizə əminsiniz?')) {
                showResults();
            }
        }
    }

    function restartExam() {
        clearInterval(timerInterval);
        currentQuestionIndex = 0;
        userAnswers = new Array(50).fill(null);
        markedForReview = new Array(50).fill(false);
        
        // Seçenekleri yeniden karıştır
        selectedQuestions.forEach((question, index) => {
            shuffledOptions[index] = shuffleOptions(question.options, question.correct_answer);
        });
        
        timeLeft = 120 * 60;
        examStarted = true;
        resultModal.classList.add('hidden');

        // Soru butonlarını sıfırla
        createQuestionButtons();
        showQuestion(currentQuestionIndex);
        updateStats();
        updateSidebarStats();
        startTimer();
    }

    // Event listener'lar
    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex === selectedQuestions.length - 1) {
            finishExam();
        } else {
            goToQuestion(currentQuestionIndex + 1);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) goToQuestion(currentQuestionIndex - 1);
    });

    // Nəzərdən Keçir butonuna tıklama olayı
    markReviewBtn.addEventListener('click', toggleMarkForReview);

    // Doğru cevabı göster/gizle butonuna tıklama olayı
    showAnswerBtn.addEventListener('click', toggleShowAnswer);

    finishExamBtn.addEventListener('click', finishExam);

    closeModal.addEventListener('click', () => {
        resultModal.classList.add('hidden');
    });

    restartExamBtn.addEventListener('click', restartExam);
});