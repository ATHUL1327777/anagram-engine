(function () {
  const originalWebSocket = window.WebSocket;
  let waitForNextAnagram = false;
  let solutionQueue = [];

  window.WebSocket = function (...args) {
    const ws = new originalWebSocket(...args);

    ws.addEventListener('message', async function (event) {
      const data = event.data;

      if (typeof data === 'string') {
        if (data.includes('is the first to give the right answer')) {
          console.log('⏸️ Correct answer acknowledged. Pausing until next anagram...');
          waitForNextAnagram = true;
          solutionQueue = [];
          return;
        }

        if (data.includes(':srv PRIVMSG') && data.includes(':Anagram :')) {
          console.log('[🧩 Anagram Detected]', data);

          if (waitForNextAnagram) {
            console.log('🔁 Resuming: New anagram detected.');
            waitForNextAnagram = false;
          }

          const match = data.match(/:Anagram\s*:\s*([A-Z]+)\s*\*(\S+)/i);
          if (match && !waitForNextAnagram) {
            const letters = match[1];
            const knownWord = match[2];

            console.log(`📝 Letters: ${letters}`);
            console.log(`📌 Word before *: ${knownWord}`);

            const delayBeforeSolving = 2000 + Math.floor(Math.random() * 2000); // 2–4 sec

            console.log(`⏳ Delaying solution dispatch by ${delayBeforeSolving}ms...`);
            setTimeout(async () => {
              try {
                const wordlistText = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words.txt')
                  .then((res) => res.text());

                const words = wordlistText.split('\n');
                const sortedLetters = letters.split('').sort().join('');

                const possibleWords = words.filter((word) => {
                  return (
                    word.length === letters.length &&
                    word.toLowerCase().split('').sort().join('') === sortedLetters.toLowerCase()
                  );
                });

                console.log('✅ Possible solution(s):', possibleWords);
                solutionQueue = [...possibleWords];
                dispatchSolutions();
              } catch (err) {
                console.error('❌ Failed to fetch or process wordlist:', err);
              }
            }, delayBeforeSolving);
          }
        }
      }
    });

    return ws;
  };

  window.WebSocket.prototype = originalWebSocket.prototype;
  console.log('🔍 WebSocket monitor with delayed Anagram solver injected');

  function dispatchSolutions() {
    const input = document.querySelector('#channel-new-message__text-field-input');
    const sendButton = document.querySelector('#channel-new-message__send-button');

    if (!input || !sendButton) {
      console.warn('❗ Input or Send Button not found.');
      return;
    }

    let i = 0;

    function sendNext() {
      if (waitForNextAnagram || i >= solutionQueue.length) {
        console.log('🛑 Dispatch stopped — paused or finished.');
        return;
      }

      const word = solutionQueue[i];
      input.value = word;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      sendButton.click();

      i++;
      const randomDelay = 2000 + Math.floor(Math.random() * 2000); // 2–4 sec
      setTimeout(sendNext, randomDelay);
    }

    sendNext();
  }
})();