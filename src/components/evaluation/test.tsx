interface testProps {
  // Define props here
}

const test: React.FC<testProps> = ({}) => {
  const ratingBG = (value: number) => {
    switch (value) {
      case 1:
        return "bg-red-100 text-red-800";
      case 2:
        return "bg-orange-100 text-orange-800";
      case 3:
        return "bg-yellow-100 text-yellow-800";
      case 4:
        return "bg-blue-100 text-blue-800";
      case 5:
        return "bg-green-100 text-green-800";
      default:
        return "";
    }
  };
  const rating = (value: number) => {
    switch (value) {
      case 1:
        return "Unsatisfactory";
      case 2:
        return "Needs Improvement";
      case 3:
        return "Meets Expectations";
      case 4:
        return "Exceeds Expectation";
      case 5:
        return "Outstanding";
      default:
        return "Not Rated";
    }
  };

  const JOB_KNOWLEDGE = {
    1: {
      indicator:
        "  Mastery in Core Competencies and Job Functions  (L.E.A.D.E.R.)",
      example:
        " Demonstrates comprehensive understanding of job requirements and applies knowledge effectively.",
    },
    2: {
      indicator: "  Keeps Documentation Updated",
      example:
        "  Maintains current and accurate documentation for projects and processes.",
    },
    3: {
      indicator: " Problem Solving",
      example:
        " Effectively identifies and resolves work-related challenges using job knowledge.",
    },
  };

  const QUALITY_OF_WORK = {
    1: {
      indicator: "Meets Standards and Requirements",
      example:
        "  Consistently delivers work that meets or exceeds established standards and requirements.",
    },
    2: {
      indicator: " Work Output Volume (L.E.A.D.E.R.)",
      example:
        "Produces an appropriate volume of work output relative to role expectations.",
    },
    3: {
      indicator: "Consistency in Performance (L.E.A.D.E.R.)",
      example:
        "Maintains consistent quality and performance standards across all tasks and projects.",
    },
    4: {
      indicator: " Attention to Detail",
      example:
        "Demonstrates thoroughness and accuracy in work, catching and correcting errors.",
    },
  };

  const ADAPTABILITY = {
    1: {
      indicator: " Openness to Change (attitude towards change)",
      example:
        " Demonstrates a positive attitude and openness to new ideas and major changes at work",
    },
    2: {
      indicator: " Flexibility in Job Role (ability to adapt to changes)",
      example:
        "Adapts to changes in job responsibilities and willingly takes on new tasks",
    },
    3: {
      indicator: "Resilience in the Face of Challenges",
      example:
        " Maintains a positive attitude and performance under challenging or difficult conditions",
    },
  };

  const TEAMWORK = {
    1: {
      indicator: "Active Participation in Team Activities",
      example:
        "  Actively participates in team meetings and projects. Contributes ideas and feedback during discussions. Engages in team tasks to achieve group goals.",
    },
    2: {
      indicator: "Promotion of a Positive Team Culture",
      example:
        "  Interacts positively with coworkers. Fosters inclusive team culture. Provides support and constructive feedback. Promotes teamwork and camaraderie.",
    },

    ///to be continue contol+f this in viewresultsmodal to see continue
  };

  return <div></div>;
};

export default test;
