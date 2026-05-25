def test_lesson_completion_awards_xp_once(client):
    courses_response = client.get("/api/v1/lessons/courses")
    assert courses_response.status_code == 200
    course = courses_response.json()["data"][0]
    lesson = next(
        item
        for module in course["modules"]
        for item in module["lessons"]
        if not item["progress"]["completed"]
    )

    before_xp = client.get("/api/v1/auth/me").json()["data"]["xp"]
    payload = {"progress_percent": 100, "last_position_seconds": lesson["duration_minutes"] * 60, "completed": True}

    first_response = client.put(f"/api/v1/lessons/{lesson['id']}/progress", json=payload)
    assert first_response.status_code == 200
    first_progress = first_response.json()["data"]
    assert first_progress["completed"] is True
    assert first_progress["xp_earned"] >= 25
    assert first_progress["total_xp"] == before_xp + first_progress["xp_earned"]

    second_response = client.put(f"/api/v1/lessons/{lesson['id']}/progress", json=payload)
    assert second_response.status_code == 200
    second_progress = second_response.json()["data"]
    assert second_progress["completed"] is True
    assert second_progress["xp_earned"] == 0
    assert second_progress["total_xp"] == first_progress["total_xp"]


def test_course_payload_exposes_modules_rewards_and_rank(client):
    response = client.get("/api/v1/lessons/courses")
    assert response.status_code == 200
    course = response.json()["data"][0]

    assert course["xp_reward"] == 200
    assert course["user_rank"]["name"]
    assert course["user_rank"]["exercise_difficulty"] in {"easy", "medium", "hard"}
    assert course["modules"]
    assert course["modules"][0]["xp_reward"] == 75
    assert course["modules"][0]["lessons"][0]["xp_reward"] == 25
