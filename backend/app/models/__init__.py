from app.models.ai import AIInteractionLog, AIJob, AIKnowledgeChunk, AIKnowledgeDocument, StudentLearningProfile
from app.models.essay import Essay, EssayCorrection, EssayStatus, EssayTheme, EssayVersion, EssayVersionCorrection
from app.models.exam import MockExam, MockExamAttempt, MockExamQuestion
from app.models.gamification import Achievement, Goal, UserAchievement
from app.models.learning import Course, Difficulty, Exercise, ExerciseAnswer, Lesson, LessonProgress, Module
from app.models.user import User, UserRole

__all__ = [
    "Achievement",
    "AIInteractionLog",
    "AIJob",
    "AIKnowledgeChunk",
    "AIKnowledgeDocument",
    "Course",
    "Difficulty",
    "Essay",
    "EssayCorrection",
    "EssayStatus",
    "EssayTheme",
    "EssayVersion",
    "EssayVersionCorrection",
    "Exercise",
    "ExerciseAnswer",
    "Goal",
    "Lesson",
    "LessonProgress",
    "MockExam",
    "MockExamAttempt",
    "MockExamQuestion",
    "Module",
    "StudentLearningProfile",
    "User",
    "UserAchievement",
    "UserRole",
]

