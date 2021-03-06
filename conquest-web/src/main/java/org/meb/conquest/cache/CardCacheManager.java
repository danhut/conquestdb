package org.meb.conquest.cache;

import java.io.Serializable;
import java.util.List;

import javax.annotation.PostConstruct;
import javax.inject.Inject;
import javax.persistence.EntityManager;

import org.apache.commons.lang3.StringUtils;
import org.meb.conquest.db.dao.CardDao;
import org.meb.conquest.db.model.CardType;
import org.meb.conquest.db.model.loc.Card;
import org.meb.conquest.db.query.CardQuery;
import org.meb.conquest.db.util.DatabaseUtils;
import org.meb.conquest.deck.helper.DeckHelper;
import org.meb.conquest.deck.helper.DeckHelperFactory;
import org.meb.conquest.service.RequestContext;
import org.meb.conquest.service.impl.DeckServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import net.sf.ehcache.Cache;
import net.sf.ehcache.CacheManager;
import net.sf.ehcache.Element;

public class CardCacheManager {
	
	private static final Logger log = LoggerFactory.getLogger(DeckServiceImpl.class);

	@Inject
	private EntityManager em;

	@Inject
	private RequestContext requestContext;

	private CardDao cardDao;

	@PostConstruct
	private void initialize() {
		cardDao = new CardDao(em);
	}

	private Cache getCache() {
		requestContext.checkUserLanguageSet();
		Cache cache = CacheManager.getInstance().getCache(getCacheName(requestContext.getUserLanguage()));		
		
		Element element = cache.get(getCardsKey());
		if (element == null) {
			synchronized (CardCacheManager.class) {
				element = cache.get(getCardsKey());
				if (element == null) {
					DatabaseUtils.executeSetUserLang(em, requestContext.getUserLanguage());
					List<Card> cards = cardDao.find(new CardQuery());
					cache.put(new Element(getCardsKey(), cards));
					for (Card card : cards) {
						cache.put(new Element(card.getId(), card));
					}
				}
			}
		}
		
		return cache;
	}
	
	private String getCacheName(String language) {
		if (StringUtils.isBlank(language)) {
			throw new IllegalArgumentException("Language is blank");
		}
		return "cache.card." + language;
	}
	
	private Serializable getCardsKey() {
		return "card.all";
	}
	
	private Serializable getWarlordCardsKey(Long warlordId) {
		if (warlordId == null) {
			throw new IllegalArgumentException("Warlord id is null");
		}
		return "card.warlord." + warlordId;
	}

	public Card getCard(Long cardId) {
		Card card;
		
		Element element = getCache().get(cardId);
		if (element == null) {
			card = null;
		} else {
			card = (Card) element.getObjectValue();
		}
		
		return card;
	}
	
	public List<Card> getWarlordCards(Long warlordId) {
		Cache cache = getCache();
		
		Serializable warlordCardsKey = getWarlordCardsKey(warlordId);
		Element warlordCardsElement = cache.get(warlordCardsKey);
		if (warlordCardsElement == null) {
			synchronized (warlordCardsKey) {
				warlordCardsElement = cache.get(warlordCardsKey);
				if (warlordCardsElement == null) {
					
					Element warlordElement = cache.get(warlordId);
					if (warlordElement == null) {
						throw new IllegalArgumentException("No warlord, id: " + warlordId);
					}
					
					Card warlord = (Card) warlordElement.getObjectValue();
					if (warlord.getType() != CardType.WARLORD) {
						throw new IllegalArgumentException("Not a warlord, id: " + warlordId);
					}

					@SuppressWarnings("unchecked")
					List<Card> cards = (List<Card>) cache.get(getCardsKey()).getObjectValue();
					
					DeckHelper helper = DeckHelperFactory.buildDeckHelper(warlord);
					List<Card> warlordCards = helper.filterAllowedCards(cards);
					warlordCardsElement = new Element(warlordCardsKey, warlordCards);
					cache.put(warlordCardsElement);
				}
			}
		}
		
		@SuppressWarnings("unchecked")
		List<Card> warlordCards = (List<Card>) warlordCardsElement.getObjectValue();
		log.info("returning {} cards for warlord {}", warlordCards.size(), warlordId);
		return warlordCards;
	}	
}
