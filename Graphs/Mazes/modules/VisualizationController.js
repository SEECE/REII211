/**
 * VisualizationController.js - Manages step-by-step visualization
 */

const VisualizationController = (function() {
    let allSteps = [];
    let currentStep = 0;
    let solving = false;
    let animationFrame = null;
    
    function setSteps(steps) {
        allSteps = steps;
        currentStep = 0;
    }
    
    function getSteps() {
        return allSteps;
    }
    
    function getCurrentStep() {
        return currentStep;
    }
    
    function getTotalSteps() {
        return allSteps.length;
    }
    
    function nextStep() {
        if (currentStep < allSteps.length) {
            currentStep++;
            return currentStep - 1;
        }
        return -1;
    }
    
    function prevStep() {
        if (currentStep > 0) {
            currentStep--;
            return currentStep;
        }
        return -1;
    }
    
    function reset() {
        allSteps = [];
        currentStep = 0;
        solving = false;
    }
    
    function isSolving() {
        return solving;
    }
    
    function setSolving(value) {
        solving = value;
    }
    
    function getGridAtStep(stepIndex, originalGrid) {
        if (stepIndex < 0 || stepIndex >= allSteps.length) return null;
        return allSteps[stepIndex].map(row => [...row]);
    }
    
    return {
        setSteps,
        getSteps,
        getCurrentStep,
        getTotalSteps,
        nextStep,
        prevStep,
        reset,
        isSolving,
        setSolving,
        getGridAtStep,
        // Expose currentStep for direct access (used in Mazes.js animation)
        get currentStep() { return currentStep; },
        set currentStep(value) { currentStep = value; }
    };
})();