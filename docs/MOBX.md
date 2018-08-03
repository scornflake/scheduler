What's the idea then?
=====================

Observable
----------
- Make a bunch of state.
- Make this state 'observable' (using decorator, or observable() function).
- If any of this state changes, observers will be notified.

Autorun
-------
If any code within the autorun accesses an observable (or computed), this autorun will refire
if the observable state changes.



Ionic
-----
We're using MobxAngular (directive: *mobxAutorun).
This basically wraps a view with an autorun to the views detectChanges(), which calls Services.checkAndUpdateView().
From what I can tell, that walks/renders the template, thus vars used in the template.
Theory is, if the view accesses observable state, the directive re-calls detectChanges().


The People-Page Problem (part 2)
================================

This starts with 'people list' not updating when changes are made remotely.  At the time, I didn't have mobxTraceAutorun enabled on page-people, or PeopleComponent.

Local delete's would work fine.  Remote would not (the data is removed, but the UI doesn't update).

The problem with mobx:
- I put mobxTraceAutorun around, and failed. Completely. Now the local stuff doesn't work either.

It seems to be because for PeopleComponent, we pass *a list of people*. Not an observable/async.  For whatever reason, when a change is made to 'all people', that list doesn't get re-examined.

The Fix
-------
- Make 'people' @observable
- Add a getter/setter, where the setter wraps the set in a runInAction()


The People Problem
==================
PeoplePage takes an array.
It's accessing a filtered array from the main store. While the main store array is observable, the filtered variant is not.

MobxAngular is listening to the 'people' array copy it is given (because of the wrapping in mobxAutorun)
The people array is a computed copy. Not the original observable.

I would expect that when the original array is added to, that this causes the autorun to fire.
However; this is only going happen if mobxAutorun encpasulates the creation of that array.

1) Problem #1: mobxAutorun was on the PeopleComponent, not the surrounding component.
2) Events Firing on the previous page: For Teams, the 'add' method did its work before the pop() occured. I *think* this meant that the changes occured as part of the child view (from a change detection standpoint), the view was popped, and the fact that changes occured was lost. At least, that's what it feels like. I made the changes occur after pop, which seemed to fix it. (that might have been the equiv of simply delaying those changes)

Questions:
- Does calling detectChanges() on a view force a re-render [yes, if there have been changes to state]
- Why does the mobxAutorun of PeopleComponent not fire when a change is made to the root store items, and the 'people' are @computed from that?
    - A: it does. but the OnPush was preventing anything from showing, cos nothing changed at the root level (no mobxAutorun at root, ONLY the OnPush modification. Duh).



****************************
THE FIX*********************
****************************

OK, so all the trouble I had below was caused by me being an idiot and putting a change detection = 'push' on the ROOT of the app.
mobxAutorun now seems to work just fine.

****************************



Not using mobxAutorun
=====================
- See 'aaarg' below
- Had problems with animation. People pages didn't work. Teams did.

AAARG
=====
People pages
- Manages an @observable of people. PeopleComponent is passed this observable.
- Got these going, without using any mobxAutorun. In fact, when I do, they don't refresh properly, it all works better without them.

Team pages
- Manages a filtered copy of people. PeopleComponent is passed this filtered non-observable copy.
- Got these going, but 'add from existing' is doesn't update. The 'add-new' works. Delete works.
- For some reason, there's no change detection fired that I can see, after the 'OK' button is pressed, in the AlertController.
    - If you fire it manually, the 'add from existing' works as expected and the list updates.

Step1: Get everything working with NO mobx. Check.
Step2: Stop being an idiot. Check.
