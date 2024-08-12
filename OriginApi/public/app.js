
const endpoint = "https://fanoutdemo.edgecompute.app";

function formatTheNumber(number){
    // Create a number formatter
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0, // No decimal places
        maximumFractionDigits: 0  // No decimal places
    });

    // Format the number
    return formatter.format(number);

}

async function incrementCounter() {
    try {
      const response = await fetch(`${endpoint}/counter/1`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to increment counter');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to increment the counter.');
    }
  }


async function fetchInitialValue() {
    try {
      const response = await fetch(`${endpoint}/counter/1`);
      const initialValue = await response.text();
      return initialValue;
    } catch (error) {
      console.error('Failed to fetch initial value:', error);
      return 'Error';
    }
  }


async function initializeCounter() {

    const incrementBtn = document.getElementById('incrementBtn');
    incrementBtn.addEventListener('click', incrementCounter);

    const counterElement = document.getElementById('counter');

    // Fetch the initial value of the counter
    const initialValue = await fetchInitialValue();

    const {value} = JSON.parse(initialValue);
    counterElement.textContent = formatTheNumber(value);
  
    const eventSource = new EventSource(`${endpoint}/counter/1`);
  
    eventSource.onmessage = function(event) {
        const data = event.data; 
        const {value} = JSON.parse(data);
        counterElement.textContent = formatTheNumber(value)
    };
  
    eventSource.onerror = function() {
      counterElement.textContent = 'Error loading counter.';
      eventSource.close();
    };
  }
  
  document.addEventListener('DOMContentLoaded', initializeCounter);
  



document.addEventListener('keydown', async (event) => {
    // Check if the key pressed is 'Enter' (key code 13)
    if (event.key === 'Enter') {
        await incrementCounter().catch(console.error)
    }
});