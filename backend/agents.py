from crewai import Agent, Task, Crew

def run_icu_assessment(vitals):
    # 1. Define the Agent
    specialist = Agent(
        role='Senior ICU Consultant',
        goal='Analyze real-time patient data for life-critical anomalies',
        backstory='AI-driven medical expert specializing in hemodynamics.',
        verbose=True,
        allow_delegation=False
    )

    # 2. Define the Task
    analysis_task = Task(
        description=f"Review these patient vitals: {vitals}. Provide a safety status.",
        expected_output="A one-sentence status summary.",
        agent=specialist
    )

    # 3. Run the Crew
    crew = Crew(agents=[specialist], tasks=[analysis_task])
    return crew.kickoff()