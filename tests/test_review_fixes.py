"""Checks for quote tolerance, follower thresholds, and newline conditions.

No network calls. Both the Instagram and TikTok helpers are exercised.
"""
import importlib.util
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_assistant(name, folder):
    path = ROOT / folder / "GPT-도우미" / "assistant.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


IG = load_assistant("ig_assistant", "instagram")
TT = load_assistant("tt_assistant", "tiktok")
HELPERS = {"instagram": IG, "tiktok": TT}


def review(helper, quote, text="오늘 비타민 젤리를 직접 먹어봤어요!", verdict="추천",
           followers=12800, requirements="", conditions=None, checks=None,
           extra_evidence=None, fits=None, fit_targets=None, brief="비타민 젤리 소개"):
    posts = [{"id": "p1", "text": text}]
    if isinstance(quote, list):
        evidence = quote
    elif quote is None:
        evidence = []
    else:
        evidence = [{"id": "p1", "quote": quote, "why": "제품 사용을 설명해요."}]
    if extra_evidence:
        evidence = evidence + extra_evidence
    if conditions is None:
        conditions = helper.condition_list(requirements)
    if checks is None:
        checks = [{
            "id": item["id"], "state": "확인", "reason": "조건에 맞는 표현이 있어요.",
            "evidence": [{"id": "p1", "quote": text, "why": "조건을 뒷받침해요."}],
        } for item in conditions]
    obj = {
        "verdict": verdict,
        "summary": "관련 원문이 있어 우선 연락할 만해요.",
        "limits": "공개 표본의 한계가 있어요.",
        "check": "섭외 전 일정을 확인할 수 있어요.",
        "evidence": evidence,
        "fits": fits or [],
        "conditionChecks": checks,
    }
    data = {
        "posts": posts,
        "brief": brief,
        "fitTargets": fit_targets or [],
        "conditions": conditions,
        "requirements": requirements,
        "followers": followers,
    }
    return helper.validate(obj, data)


class QuoteToleranceTests(unittest.TestCase):
    def test_exact_quote_still_accepted(self):
        for helper in HELPERS.values():
            text = "오늘 비타민 젤리를 직접 먹어봤어요!"
            result = review(helper, text)
            self.assertEqual(result["verdict"], "추천")
            self.assertEqual(result["evidence"][0]["quote"], text)

    def test_trailing_punctuation_and_space_before_punctuation(self):
        text = "오늘 비타민 젤리를 직접 먹어봤어요!"
        for helper in HELPERS.values():
            for quote in (
                "오늘 비타민 젤리를 직접 먹어봤어요.",
                "오늘 비타민 젤리를 직접 먹어봤어요 !",
                "오늘  비타민   젤리를 직접 먹어봤어요!",
                "오늘비타민 젤리를 직접 먹어봤어요!",
            ):
                result = review(helper, quote, text=text)
                self.assertEqual(result["verdict"], "추천", quote)
                stored = result["evidence"][0]["quote"]
                self.assertIn("먹어봤어요", stored)
                self.assertIn(stored.replace(" ", ""), text.replace(" ", ""))

    def test_unmatched_quote_is_dropped_not_fatal(self):
        for helper in HELPERS.values():
            text = "오늘 비타민 젤리를 직접 먹어봤어요!"
            result = review(helper, [
                {"id": "p1", "quote": "전혀 다른 문장입니다.", "why": "맞지 않아요."},
                {"id": "p1", "quote": text, "why": "제품 사용을 설명해요."},
            ], text=text)
            self.assertEqual(result["verdict"], "추천")
            self.assertEqual(len(result["evidence"]), 1)
            self.assertEqual(result["evidence"][0]["quote"], text)

    def test_only_bad_quote_holds_the_grade_instead_of_raising(self):
        for helper in HELPERS.values():
            result = review(helper, "이 문장은 게시물에 없습니다.")
            self.assertEqual(result["verdict"], "판단 보류")
            self.assertEqual(result["evidence"], [])
            self.assertIn("판단을 보류", result["summary"])

    def test_bad_condition_quote_marks_that_condition_unverified(self):
        for helper in HELPERS.values():
            text = "오늘 비타민 젤리를 직접 먹어봤어요!"
            conditions = [{"id": "r1", "text": "비건 레시피를 소개한 적"}]
            checks = [{
                "id": "r1", "state": "확인", "reason": "레시피를 소개했어요.",
                "evidence": [{"id": "p1", "quote": "없는 레시피 문장", "why": "근거"}],
            }]
            result = review(helper, text, text=text, requirements="비건 레시피를 소개한 적",
                            conditions=conditions, checks=checks)
            self.assertEqual(result["conditionChecks"][0]["state"], "미확인")
            self.assertEqual(result["verdict"], "보통")
            self.assertTrue(result["evidence"])

    def test_bad_fit_quote_does_not_reject_the_review(self):
        for helper in HELPERS.values():
            text = "오늘 비타민 젤리를 직접 먹어봤어요!"
            targets = [{"kind": "product", "label": "제품 적합도", "subject": "비타민 젤리", "criteria": ""}]
            fits = [{
                "kind": "product", "verdict": "추천", "reason": "젤리를 소개했어요.",
                "missing": "", "evidence": [{"id": "p1", "quote": "없는 문장", "why": "제품"}],
            }]
            result = review(helper, text, text=text, fits=fits, fit_targets=targets)
            self.assertEqual(result["fits"][0]["verdict"], "판단 보류")
            self.assertEqual(result["verdict"], "보통")

    def test_malformed_evidence_still_raises(self):
        for helper in HELPERS.values():
            with self.assertRaises(ValueError):
                review(helper, [{"id": "p1", "quote": 1, "why": "형식 오류"}])


class FollowerThresholdTests(unittest.TestCase):
    def test_korean_and_english_thresholds(self):
        cases = [
            ("팔로워 1만 이상", 10000, "확인"),
            ("팔로워 1만 이상", 9999, "충돌"),
            ("팔로워 1만 이상", None, "미확인"),
            ("팔로워 5천 이상", 5000, "확인"),
            ("팔로워 1.5만 이상", 15000, "확인"),
            ("팔로워 1.5만 이상", 14999, "충돌"),
            ("팔로워 10,000명 이상", 10000, "확인"),
            ("최소 팔로워 1만", 20000, "확인"),
            ("팔로워 1만 초과", 10000, "충돌"),
            ("팔로워 1만 초과", 10001, "확인"),
            ("팔로워 3만 이하", 30000, "확인"),
            ("팔로워 3만 이하", 30001, "충돌"),
            ("팔로워 3만 미만", 30000, "충돌"),
            ("followers 10k+", 10000, "확인"),
            ("followers 10k+", 9999, "충돌"),
            ("followers 10k+", None, "미확인"),
            ("1.2m+ followers", 1200000, "확인"),
            ("1.2m+ followers", 1199999, "충돌"),
            ("팔로워 1만 이상 5만 이하", 20000, "확인"),
            ("팔로워 1만 이상 5만 이하", 60000, "충돌"),
        ]
        for helper in HELPERS.values():
            for text, followers, state in cases:
                with self.subTest(text=text, followers=followers, state=state):
                    result = review(
                        helper, "오늘 비타민 젤리를 직접 먹어봤어요!",
                        followers=followers, requirements=text,
                        checks=[{
                            "id": "r1", "state": "미확인", "reason": "게시물만으로는 몰라요.",
                            "evidence": [],
                        }],
                    )
                    self.assertEqual(result["conditionChecks"][0]["state"], state)
                    if state == "확인":
                        self.assertEqual(result["verdict"], "추천")
                    elif state == "미확인":
                        self.assertNotEqual(result["verdict"], "추천")
                    else:
                        self.assertEqual(result["verdict"], "비추천")
                        self.assertIn("팔로워", result["summary"])

    def test_audience_conditions_stay_unverified(self):
        for helper in HELPERS.values():
            for text in ("팔로워 거주지 서울", "팔로워 연령 20대 이상", "실제 팔로워층"):
                result = review(
                    helper, "서울에서 비타민 젤리를 먹었어요.",
                    text="서울에서 비타민 젤리를 먹었어요.",
                    followers=500000, requirements=text,
                    checks=[{
                        "id": "r1", "state": "확인", "reason": "지역이 보여요.",
                        "evidence": [{"id": "p1", "quote": "서울에서 비타민 젤리를 먹었어요.", "why": "지역"}],
                    }],
                )
                self.assertEqual(result["conditionChecks"][0]["state"], "미확인", text)
                self.assertNotEqual(result["verdict"], "추천")

    def test_external_condition_still_blocks_recommendation(self):
        for helper in HELPERS.values():
            text = "매장 내부를 걸어봤어요."
            result = review(
                helper, text, text=text, followers=80000,
                requirements="현장 방문 촬영 가능",
                checks=[{
                    "id": "r1", "state": "확인", "reason": "매장에 갔어요.",
                    "evidence": [{"id": "p1", "quote": text, "why": "방문"}],
                }],
            )
            self.assertEqual(result["conditionChecks"][0]["state"], "미확인")
            self.assertEqual(result["verdict"], "보통")

    def test_compound_line_is_not_confirmed_by_followers_alone(self):
        for helper in HELPERS.values():
            text = "오늘 비타민 젤리를 직접 먹어봤어요!"
            requirement = "팔로워 1만 이상, 뉴욕 거주"
            passed = review(helper, text, text=text, followers=20000, requirements=requirement)
            self.assertEqual(passed["conditionChecks"][0]["text"], requirement)
            self.assertEqual(passed["conditionChecks"][0]["state"], "미확인")
            self.assertNotEqual(passed["verdict"], "추천")
            failed = review(helper, text, text=text, followers=100, requirements=requirement)
            self.assertEqual(failed["conditionChecks"][0]["state"], "충돌")
            self.assertEqual(failed["verdict"], "비추천")


class ConditionSplitTests(unittest.TestCase):
    def test_newline_keeps_commas_and_old_single_line_stays_one_condition(self):
        sample = "뉴욕, 뉴저지 거주\n팔로워 1만 이상"
        for helper in HELPERS.values():
            parts = helper.condition_list(sample)
            self.assertEqual([item["text"] for item in parts], ["뉴욕, 뉴저지 거주", "팔로워 1만 이상"])
            self.assertEqual([item["id"] for item in parts], ["r1", "r2"])
            single = helper.condition_list("뉴욕, 뉴저지 거주")
            self.assertEqual([item["text"] for item in single], ["뉴욕, 뉴저지 거주"])
            legacy = helper.condition_list("현장 방문 촬영, 경쟁 브랜드 협업 확인")
            self.assertEqual(len(legacy), 1)
            self.assertIn(",", legacy[0]["text"])

    def test_blank_lines_windows_newlines_and_cap(self):
        for helper in HELPERS.values():
            parts = helper.condition_list("첫 조건\r\n\r\n둘째 조건\r셋째")
            self.assertEqual([item["text"] for item in parts], ["첫 조건", "둘째 조건", "셋째"])
            many = helper.condition_list("\n".join(f"조건 {n}" for n in range(1, 11)))
            self.assertEqual(len(many), 8)
            self.assertTrue(many[-1]["text"].startswith("조건 8"))
            self.assertIn("조건 10", many[-1]["text"])

    def test_extension_condition_list_matches_helper(self):
        samples = [
            "뉴욕, 뉴저지 거주\n팔로워 1만 이상",
            "뉴욕, 뉴저지 거주",
            "현장 방문 촬영, 경쟁 브랜드 협업 확인",
            "한 줄만",
            "첫 조건\r\n\r\n둘째 조건",
            "\n".join(f"조건 {n}" for n in range(1, 11)),
            "",
        ]
        script = r"""
const fs = require('fs');
const vm = require('vm');
const context = {CreatorReview: {}};
vm.createContext(context);
const code = fs.readFileSync(process.argv[1], 'utf8') + '\nglobalThis.CampaignReview = CampaignReview;\n';
vm.runInContext(code, context, {filename: process.argv[1]});
const cases = JSON.parse(process.argv[2]);
console.log(JSON.stringify(cases.map(value => context.CampaignReview.conditionList({requirements: value}))));
"""
        for folder in ("instagram/LinkOne-Extension-2.0.1/review.js", "tiktok/LinkOne-TikTok-2.0.1/review.js"):
            completed = subprocess.run(
                ["node", "-e", script, str(ROOT / folder), json.dumps(samples)],
                check=True, capture_output=True, text=True,
            )
            got = json.loads(completed.stdout)
            helper = IG if folder.startswith("instagram") else TT
            self.assertEqual(got, [helper.condition_list(sample) for sample in samples])


if __name__ == "__main__":
    unittest.main()
