from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_categories():
    """Get all service categories"""
    categories = [
        { "name": "Beauty & Wellness", "icon": "✨", "count": "120+ providers" },
        { "name": "Home Services", "icon": "🏠", "count": "85+ providers" },
        { "name": "Health & Fitness", "icon": "💪", "count": "95+ providers" },
        { "name": "Professional Services", "icon": "💼", "count": "150+ providers" },
        { "name": "Automotive", "icon": "🚗", "count": "45+ providers" },
        { "name": "Pet Services", "icon": "🐕", "count": "30+ providers" },
        { "name": "Education", "icon": "📚", "count": "60+ providers" },
        { "name": "Events", "icon": "🎉", "count": "40+ providers" },
    ]
    return categories
